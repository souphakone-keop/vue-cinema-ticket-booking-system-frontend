<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { http } from "../../lib/http";
import { connectSeatSocket } from "../../composables/useSeatSocket";

const route = useRoute();
const router = useRouter();

const seats = ref([]);
const showtime = ref(null);
const loading = ref(true);
const error = ref("");
const lockError = ref("");
const expiredNotice = ref(false);

// Seat ids the current user has locked in this session.
const selectedSeatIds = ref(new Set());
const lockingSeatId = ref(null);
let confirmed = false;
let closeSocket = null;

// Countdown to when the oldest active lock in this session expires.
const lockDeadline = ref(null);
const remainingSeconds = ref(0);
let countdownTimer = null;

const fetchData = async () => {
    loading.value = true;
    error.value = "";
    try {
        const [seatsRes, showtimesRes] = await Promise.all([
            http.get(`/showtimes/${route.params.showtimeId}/seats`),
            http.get("/showtimes"),
        ]);

        seats.value = seatsRes.data.seats || (Array.isArray(seatsRes.data) ? seatsRes.data : []);

        const showtimes = showtimesRes.data.showtimes || (Array.isArray(showtimesRes.data) ? showtimesRes.data : []);
        showtime.value = showtimes.find((s) => s.id === route.params.showtimeId) || null;
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

function applySeatUpdate(seatId, status) {
    const seat = seats.value.find((s) => s.id === seatId);
    if (!seat) return;

    seat.status = status;

    // Someone/something else (reaper timeout, another tab) changed a seat
    // we thought we had — drop it from our selection so the UI matches
    // what the server actually holds.
    if (status !== "LOCKED" && selectedSeatIds.value.has(seatId)) {
        selectedSeatIds.value.delete(seatId);
        selectedSeatIds.value = new Set(selectedSeatIds.value);
        if (selectedSeatIds.value.size === 0) {
            stopCountdown();
        }
    }
}

onMounted(() => {
    fetchData();
    closeSocket = connectSeatSocket(route.params.showtimeId, applySeatUpdate);
});

// Group seats into rows by the leading letter of the seat code (A1, A2, B1...).
const seatRows = computed(() => {
    const rows = {};
    for (const seat of seats.value) {
        const rowKey = seat.seat_code?.match(/^[A-Za-z]+/)?.[0] || "—";
        (rows[rowKey] ||= []).push(seat);
    }
    return Object.entries(rows).sort(([a], [b]) => a.localeCompare(b));
});

const selectedSeats = computed(() =>
    seats.value.filter((seat) => selectedSeatIds.value.has(seat.id))
);

// Every seat in a showtime shares the same price (Showtime.price) — there's
// no per-seat price field on the backend.
const seatPrice = computed(() => showtime.value?.price || 0);
const totalPrice = computed(() => selectedSeats.value.length * seatPrice.value);

const countdownLabel = computed(() => {
    const m = Math.floor(remainingSeconds.value / 60);
    const s = remainingSeconds.value % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
});

// `expiresAt` comes straight from the lock endpoint's response — never
// hardcode the TTL client-side, since the backend can change it at any
// time (e.g. 5min -> 1min) without a frontend deploy.
function startCountdownIfNeeded(expiresAt) {
    if (lockDeadline.value) return; // already counting down for this batch
    lockDeadline.value = new Date(expiresAt).getTime();

    countdownTimer = setInterval(() => {
        const secondsLeft = Math.max(0, Math.round((lockDeadline.value - Date.now()) / 1000));
        remainingSeconds.value = secondsLeft;

        if (secondsLeft === 0) {
            selectedSeatIds.value = new Set();
            expiredNotice.value = true;
            stopCountdown();
        }
    }, 1000);
    remainingSeconds.value = Math.max(0, Math.round((lockDeadline.value - Date.now()) / 1000));
}

function stopCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    lockDeadline.value = null;
}

function seatStatusClass(seat) {
    if (selectedSeatIds.value.has(seat.id)) {
        return "bg-red-600 border-red-600 text-white";
    }
    if (seat.status === "BOOKED") {
        return "bg-neutral-800 border-neutral-800 text-neutral-600 cursor-not-allowed";
    }
    if (seat.status === "LOCKED") {
        return "bg-neutral-700 border-neutral-700 text-neutral-500 cursor-not-allowed";
    }
    return "bg-neutral-900 border-neutral-700 text-gray-300 hover:border-red-500 hover:text-white";
}

function isDisabled(seat) {
    return (
        lockingSeatId.value === seat.id ||
        ((seat.status === "BOOKED" || seat.status === "LOCKED") &&
            !selectedSeatIds.value.has(seat.id))
    );
}

async function toggleSeat(seat) {
    if (isDisabled(seat)) return;

    lockError.value = "";
    expiredNotice.value = false;
    lockingSeatId.value = seat.id;

    try {
        if (selectedSeatIds.value.has(seat.id)) {
            await http.post(`/seats/${seat.id}/unlock`);
            selectedSeatIds.value.delete(seat.id);
            selectedSeatIds.value = new Set(selectedSeatIds.value);
            seat.status = "AVAILABLE";
            if (selectedSeatIds.value.size === 0) stopCountdown();
        } else {
            const res = await http.post(`/seats/${seat.id}/lock`);
            selectedSeatIds.value.add(seat.id);
            selectedSeatIds.value = new Set(selectedSeatIds.value);
            seat.status = "LOCKED";
            startCountdownIfNeeded(res.data.expires_at);
        }
    } catch (err) {
        // 409 = someone else already grabbed this seat between our fetch
        // and this click; the WS broadcast will correct the seat map too.
        lockError.value =
            err.response?.status === 409
                ? "That seat was just taken by someone else."
                : err.response?.data?.error || err.message;
    } finally {
        lockingSeatId.value = null;
    }
}

async function releaseAllSelected() {
    const ids = [...selectedSeatIds.value];
    selectedSeatIds.value = new Set();
    await Promise.allSettled(ids.map((id) => http.post(`/seats/${id}/unlock`)));
}

onBeforeUnmount(() => {
    stopCountdown();
    closeSocket?.();
    if (!confirmed && selectedSeatIds.value.size > 0) {
        releaseAllSelected();
    }
});

function goToConfirm() {
    if (selectedSeatIds.value.size === 0) return;

    confirmed = true;
    sessionStorage.setItem(
        "booking_selection",
        JSON.stringify({
            showtimeId: route.params.showtimeId,
            seatIds: [...selectedSeatIds.value],
            seats: selectedSeats.value.map((s) => ({
                id: s.id,
                label: s.seat_code,
                price: seatPrice.value,
            })),
        })
    );

    router.push({ name: "booking-confirm" });
}
</script>

<template>
    <div class="min-h-screen bg-black text-white px-8 py-12 pb-32">
        <button class="btn btn-dark btn-sm text-gray-400 mb-6" @click="router.back()">
            ← Back
        </button>

        <h1 class="text-3xl font-bold">Select Your Seats</h1>
        <p class="text-gray-400 mt-1">
            Tap a seat to lock it for you. Tap again to release it.
            <span v-if="seatPrice" class="text-gray-500">· {{ seatPrice }}THB / seat</span>
        </p>

        <div v-if="loading" class="flex justify-center py-20">
            <span class="loading loading-spinner loading-lg text-red-600"></span>
        </div>

        <div v-else-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 max-w-xl mt-10">
            <span>⚠️ {{ error }}</span>
        </div>

        <div v-else-if="seats.length === 0" class="text-center py-20 text-gray-400">
            <div class="text-6xl mb-4">💺</div>
            <p class="text-lg">No data found.</p>
        </div>

        <template v-else>
            <div v-if="lockError" class="alert bg-neutral-900 border border-red-900/50 text-red-400 max-w-xl mt-6">
                <span>⚠️ {{ lockError }}</span>
            </div>

            <div v-if="expiredNotice" class="alert bg-neutral-900 border border-amber-900/50 text-amber-400 max-w-xl mt-6">
                <span>⏱️ Your seat hold expired. Please select your seats again.</span>
            </div>

            <!-- Screen -->
            <div class="mt-10 mb-10 flex flex-col items-center">
                <div class="w-2/3 h-2 bg-gradient-to-r from-transparent via-gray-500 to-transparent rounded-full"></div>
                <p class="text-xs text-gray-500 mt-2 tracking-widest">SCREEN</p>
            </div>

            <div class="flex flex-col items-center gap-3">
                <div v-for="[rowKey, rowSeats] in seatRows" :key="rowKey" class="flex items-center gap-3">
                    <span class="w-5 text-gray-500 text-sm">{{ rowKey }}</span>
                    <div class="flex gap-2">
                        <button v-for="seat in rowSeats" :key="seat.id" :disabled="isDisabled(seat)"
                            class="w-9 h-9 rounded-md border text-xs font-medium flex items-center justify-center transition"
                            :class="seatStatusClass(seat)" @click="toggleSeat(seat)">
                            {{ seat.seat_code }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Legend -->
            <div class="flex justify-center gap-6 mt-10 text-xs text-gray-400">
                <div class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded bg-neutral-900 border border-neutral-700"></span> Available
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded bg-red-600"></span> Your Selection
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded bg-neutral-700"></span> Locked
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded bg-neutral-800"></span> Booked
                </div>
            </div>
        </template>

        <!-- Sticky Summary Bar -->
        <div v-if="selectedSeats.length > 0"
            class="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-8 py-4 flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-400">
                    {{ selectedSeats.length }} seat{{ selectedSeats.length === 1 ? "" : "s" }} selected:
                    <span class="text-white font-medium">
                        {{ selectedSeats.map((s) => s.seat_code).join(", ") }}
                    </span>
                </p>
                <div class="flex items-center gap-3 mt-1">
                    <p v-if="totalPrice" class="text-red-500 font-bold">{{ totalPrice }}THB</p>
                    <p v-if="lockDeadline" class="text-xs text-amber-400 font-mono">
                        ⏱ Hold expires in {{ countdownLabel }}
                    </p>
                </div>
            </div>

            <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="goToConfirm">
                Continue to Booking →
            </button>
        </div>
    </div>
</template>
