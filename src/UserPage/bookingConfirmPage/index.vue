<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { http } from "../../lib/http";

const router = useRouter();

const selection = ref(null);
const submitting = ref(false);
const error = ref("");
const confirmedBooking = ref(null);

onMounted(() => {
    const raw = sessionStorage.getItem("booking_selection");
    if (!raw) {
        router.replace("/");
        return;
    }
    selection.value = JSON.parse(raw);
});

const totalPrice = computed(() =>
    (selection.value?.seats || []).reduce((sum, seat) => sum + (seat.price || 0), 0)
);

const confirmBooking = async () => {
    if (!selection.value) return;

    submitting.value = true;
    error.value = "";
    try {
        const res = await http.post("/bookings/confirm", {
            showtime_id: selection.value.showtimeId,
            seat_ids: selection.value.seatIds,
        });

        confirmedBooking.value = res.data.booking || res.data;
        sessionStorage.removeItem("booking_selection");
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        submitting.value = false;
    }
};

function goHome() {
    router.push("/");
}

function goToMyTickets() {
    router.push("/my-ticket");
}
</script>

<template>
    <div class="min-h-screen bg-black text-white px-4 py-12 flex justify-center">
        <div class="w-full max-w-lg">
            <!-- Success State -->
            <div v-if="confirmedBooking" class="card bg-neutral-900 border border-neutral-800 text-center">
                <div class="card-body items-center p-10">
                    <div class="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-green-500" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 class="text-2xl font-bold">Booking Confirmed!</h1>
                    <p class="text-gray-400 mt-2">
                        Your seats are booked. Enjoy the show 🎬
                    </p>

                    <div class="flex gap-3 mt-8">
                        <button class="btn btn-outline border-neutral-700 text-white" @click="goHome">
                            Back to Home
                        </button>
                        <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="goToMyTickets">
                            My Tickets
                        </button>
                    </div>
                </div>
            </div>

            <!-- Review / Confirm State -->
            <div v-else-if="selection" class="card bg-neutral-900 border border-neutral-800">
                <div class="card-body p-8">
                    <h1 class="text-2xl font-bold">Confirm Your Booking</h1>
                    <p class="text-gray-400 mt-1">Review your seats before confirming.</p>

                    <div class="divider my-6"></div>

                    <div class="space-y-3">
                        <div v-for="seat in selection.seats" :key="seat.id"
                            class="flex justify-between items-center text-sm">
                            <span class="text-gray-300">Seat {{ seat.label }}</span>
                            <span class="text-gray-400">{{ seat.price || 0 }}THB</span>
                        </div>
                    </div>

                    <div class="divider my-6"></div>

                    <div class="flex justify-between items-center">
                        <span class="font-semibold">Total</span>
                        <span class="text-xl font-bold text-red-500">{{ totalPrice }}THB</span>
                    </div>

                    <div v-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm mt-6">
                        <span>⚠️ {{ error }}</span>
                    </div>

                    <button :disabled="submitting"
                        class="btn w-full bg-red-600 hover:bg-red-700 border-none text-white mt-8 disabled:opacity-60"
                        @click="confirmBooking">
                        <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                        {{ submitting ? "Confirming..." : "Confirm Booking" }}
                    </button>
                    
                    <button class="btn btn-dark w-full mt-2 text-gray-400" @click="router.back()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
