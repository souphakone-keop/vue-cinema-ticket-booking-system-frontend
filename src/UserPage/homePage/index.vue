<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();

// Same idea as before: configurable via .env (VITE_API_BASE_URL), falls
// back to localhost:8080 so this still works with zero setup.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const movies = ref([]);
const loading = ref(true);
const error = ref("");

const fetchMovies = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true;
  error.value = "";
  try {
    const res = await axios.get(`${API_BASE}/movies`);
    movies.value = res.data.movies || [];
  } catch (err) {
    if (!silent) error.value = err.response?.data?.error || err.message;
  } finally {
    if (!silent) loading.value = false;
  }
};

onMounted(() => {
  fetchMovies();
});

// Clicking "Home" while already on this route doesn't remount the
// component, so re-fetch on every navigation that lands back on "home".
const stopAfterEach = router.afterEach((to) => {
  if (to.name === "home") {
    fetchMovies();
  }
});

// Poll in the background so newly added movies show up without needing
// a navigation event (e.g. movies added directly via the backend/API).
const pollInterval = setInterval(() => fetchMovies({ silent: true }), 10000);

onUnmounted(() => {
  stopAfterEach();
  clearInterval(pollInterval);
});

function formatDuration(min) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Real Mongo docs don't have a "rating" field, so this derives a stand-in
// badge from the genre instead of showing a fake number.
function primaryGenre(genre) {
  return genre ? genre.split("/")[0] : "";
}

function goToShowtimes(movie) {
  router.push({ name: "showtimes", params: { movieId: movie.id } });
}

function scrollToMovies() {
  document.getElementById("now-showing")?.scrollIntoView({ behavior: "smooth" });
}

// The seeded poster_url values are placeholder links that don't actually
// resolve to images — swap to the emoji placeholder if one fails to load
// instead of showing a broken image icon.
function onPosterError(event) {
  event.target.style.display = "none";
  event.target.nextElementSibling?.classList.remove("hidden");
}
</script>

<template>
  <div>
    <!-- Hero -->
    <div class="hero min-h-[75vh] relative"
      style="background-image:url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920');">
      <div class="hero-overlay bg-gradient-to-t from-black via-black/70 to-black/40"></div>

      <div class="hero-content text-left w-full max-w-6xl px-8">
        <div class="max-w-xl">
          <div class="badge badge-error gap-2 py-3 px-4 text-sm font-semibold mb-4">
            🔥 Now booking for this week
          </div>

          <h1 class="text-5xl md:text-6xl font-bold leading-tight">
            Experience Movies
            <span class="text-red-600"> Like Never Before </span>
          </h1>

          <p class="py-6 text-gray-300 text-lg">
            Book your favorite movies anytime, anywhere. Enjoy premium seats, IMAX, and exclusive
            cinema experiences.
          </p>

          <div class="flex flex-wrap gap-4">
            <button class="btn btn-lg bg-red-600 hover:bg-red-700 border-none text-white" @click="scrollToMovies">
              🎟 Browse Movies
            </button>

            <RouterLink to="/my-ticket"
              class="btn btn-lg btn-outline border-white/40 text-white hover:bg-white/10 hover:border-white/40">
              My Tickets
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Now Showing -->
    <section id="now-showing" class="px-8 py-14">
      <div class="flex items-end justify-between mb-8">
        <div>
          <h2 class="text-3xl font-bold">🔥 Now Showing</h2>
          <p class="text-gray-400 mt-1">Grab your seat before it's gone</p>
        </div>

        <div v-if="!loading && movies.length" class="text-sm text-gray-500 hidden sm:block">
          {{ movies.length }} movie{{ movies.length === 1 ? '' : 's' }} playing
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div v-for="n in 8" :key="n" class="animate-pulse">
          <div class="h-80 w-full rounded-xl bg-neutral-800"></div>
          <div class="h-4 w-3/4 rounded bg-neutral-800 mt-4"></div>
          <div class="h-3 w-1/2 rounded bg-neutral-800 mt-2"></div>
        </div>
      </div>

      <div v-else-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 max-w-xl">
        <span>⚠️ Couldn't reach the API at {{ API_BASE }}: {{ error }}</span>
      </div>

      <div v-else-if="movies.length === 0" class="text-center py-20 text-gray-400">
        <div class="text-6xl mb-4">🎬</div>
        <p class="text-lg">No data found. </p>

      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div v-for="movie in movies" :key="movie.id"
          class="card bg-neutral-900 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-900/30 duration-300 shadow-xl cursor-pointer group overflow-hidden"
          @click="goToShowtimes(movie)">
          <figure class="h-80 bg-neutral-800 relative overflow-hidden">
            <img v-if="movie.poster_url" :src="movie.poster_url" :alt="movie.title"
              class="h-80 w-full object-cover group-hover:scale-110 duration-300" @error="onPosterError" />
            <div class="hidden absolute inset-0 items-center justify-center text-5xl h-full w-full">
              🎬
            </div>

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 duration-300 flex items-end justify-center pb-6">
              <span class="btn btn-sm bg-red-600 border-none text-white">▶ Book Now</span>
            </div>
          </figure>

          <div class="card-body">
            <h2 class="card-title text-base leading-snug">{{ movie.title }}</h2>

            <p class="text-gray-400 text-sm">
              {{ movie.genre }}<span v-if="movie.duration_min"> · {{ formatDuration(movie.duration_min) }}</span>
            </p>

            <div class="flex justify-between items-center mt-2">
              <div v-if="primaryGenre(movie.genre)" class="badge badge-error badge-outline">
                {{ primaryGenre(movie.genre) }}
              </div>

              <button class="btn btn-xs bg-red-600 hover:bg-red-700 border-none text-white">Book</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
