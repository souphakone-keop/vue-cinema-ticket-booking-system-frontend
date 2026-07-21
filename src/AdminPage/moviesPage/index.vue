<script setup>
import { ref, onMounted } from "vue";
import { adminHttp } from "../../lib/http";

const movies = ref([]);
const loading = ref(true);
const error = ref("");
const saving = ref(false);

const showModal = ref(false);
const editingId = ref(null);
const form = ref({
    title: "",
    genre: "",
    duration_min: "",
    poster_url: "",
    description: "",
});

const deleteTarget = ref(null);

const fetchMovies = async () => {
    loading.value = true;
    error.value = "";
    try {
        const res = await adminHttp.get("/movies");
        movies.value = res.data.movies || (Array.isArray(res.data) ? res.data : []);
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchMovies);

const openCreate = () => {
    editingId.value = null;
    form.value = { title: "", genre: "", duration_min: "", poster_url: "", description: "" };
    showModal.value = true;
};

const openEdit = (movie) => {
    editingId.value = movie.id;
    form.value = {
        title: movie.title || "",
        genre: movie.genre || "",
        duration_min: movie.duration_min || "",
        poster_url: movie.poster_url || "",
        description: movie.description || "",
    };
    showModal.value = true;
};

const saveMovie = async () => {
    saving.value = true;
    error.value = "";
    try {
        const payload = {
            ...form.value,
            duration_min: form.value.duration_min ? Number(form.value.duration_min) : 0,
        };

        if (editingId.value) {
            await adminHttp.put(`/movies/${editingId.value}`, payload);
        } else {
            await adminHttp.post("/movies", payload);
        }

        showModal.value = false;
        await fetchMovies();
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        saving.value = false;
    }
};

const confirmDelete = (movie) => {
    deleteTarget.value = movie;
};

const deleteMovie = async () => {
    if (!deleteTarget.value) return;
    try {
        await adminHttp.delete(`/movies/${deleteTarget.value.id}`);
        deleteTarget.value = null;
        await fetchMovies();
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
        deleteTarget.value = null;
    }
};
</script>

<template>
    <div class="p-8">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-900">Movies</h1>
                <p class="mt-1 text-slate-500">Manage the movies shown on your site.</p>
            </div>

            <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="openCreate">
                + Add Movie
            </button>
        </div>

        <div v-if="error" class="alert bg-red-50 border border-red-200 text-red-700 text-sm mt-6">
            <span>⚠️ {{ error }}</span>
        </div>

        <div class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="table min-w-[640px]">
                    <thead>
                        <tr class="text-slate-500 text-xs uppercase whitespace-nowrap bg-slate-50">
                            <th>Movie</th>
                            <th>Genre</th>
                            <th>Duration</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading">
                            <td colspan="4" class="text-center py-10">
                                <span class="loading loading-spinner loading-md text-red-600"></span>
                            </td>
                        </tr>

                        <tr v-else-if="movies.length === 0">
                            <td colspan="4" class="text-center py-10 text-slate-400">
                                No data found.
                            </td>
                        </tr>

                        <tr v-for="movie in movies" :key="movie.id" class="hover whitespace-nowrap">
                            <td>
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-10 h-14 rounded bg-slate-100 overflow-hidden flex items-center justify-center text-lg shrink-0">
                                        <img v-if="movie.poster_url" :src="movie.poster_url" :alt="movie.title"
                                            class="w-full h-full object-cover" />
                                        <span v-else>🎬</span>
                                    </div>
                                    <span class="font-medium text-slate-900">{{ movie.title }}</span>
                                </div>
                            </td>
                            <td class="text-slate-600">{{ movie.genre || "—" }}</td>
                            <td class="text-slate-600">
                                {{ movie.duration_min ? `${movie.duration_min} min` : "—" }}
                            </td>
                            <td class="text-right">
                                <button class="btn btn-xs btn-ghost text-red-600" @click="openEdit(movie)">
                                    Edit
                                </button>
                                <button class="btn btn-xs btn-ghost text-red-600" @click="confirmDelete(movie)">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Create / Edit Modal -->
        <dialog class="modal" :class="{ 'modal-open': showModal }">
            <div class="modal-box bg-white text-slate-800 max-w-lg">
                <h3 class="text-lg font-bold text-slate-900">
                    {{ editingId ? "Edit Movie" : "Add Movie" }}
                </h3>

                <form class="space-y-4 mt-4" @submit.prevent="saveMovie">
                    <div>
                        <label class="label"><span class="label-text">Title</span></label>
                        <input v-model="form.title" type="text" required class="input input-bordered w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="label"><span class="label-text">Genre</span></label>
                            <input v-model="form.genre" type="text" class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>

                        <div>
                            <label class="label"><span class="label-text">Duration (min)</span></label>
                            <input v-model="form.duration_min" type="number" min="0"
                                class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>
                    </div>

                    <div>
                        <label class="label"><span class="label-text">Poster URL</span></label>
                        <input v-model="form.poster_url" type="text" class="input input-bordered w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div>
                        <label class="label"><span class="label-text">Description</span></label>
                        <textarea v-model="form.description" class="textarea textarea-bordered w-full bg-gray-100 text-gray-900" rows="3" />
                    </div>

                    <div class="modal-action">
                        <button type="button" class="btn btn-dark" @click="showModal = false">
                            Cancel
                        </button>

                        <button type="submit" :disabled="saving"
                            class="btn bg-red-600 hover:bg-red-700 border-none text-white disabled:opacity-60">
                            <span v-if="saving" class="loading loading-spinner loading-sm"></span>
                            {{ editingId ? "Save Changes" : "Create Movie" }}
                        </button>
                    </div>
                </form>
            </div>

            <form method="dialog" class="modal-backdrop" @click="showModal = false">
                <button>close</button>
            </form>
        </dialog>

        <!-- Delete Confirm Modal -->
        <dialog class="modal" :class="{ 'modal-open': !!deleteTarget }">
            <div class="modal-box bg-white text-slate-800">
                <h3 class="text-lg font-bold text-slate-900">Delete Movie</h3>
                <p class="mt-3 text-slate-600">
                    Are you sure you want to delete
                    <span class="font-semibold">{{ deleteTarget?.title }}</span>? This cannot be undone.
                </p>

                <div class="modal-action">
                    <button class="btn btn-dark" @click="deleteTarget = null">Cancel</button>
                    <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="deleteMovie">
                        Delete
                    </button>
                </div>
            </div>

            <form method="dialog" class="modal-backdrop" @click="deleteTarget = null">
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
