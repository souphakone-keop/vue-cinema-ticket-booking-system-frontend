<script setup>
import { ref, onMounted } from "vue";
import { adminHttp } from "../../lib/http";

const users = ref([]);
const loading = ref(true);
const error = ref("");
const deleteTarget = ref(null);
const roleSaving = ref(null);
const roleChangeTarget = ref(null);

const fetchUsers = async () => {
    loading.value = true;
    error.value = "";
    try {
        const res = await adminHttp.get("/users");
        users.value = res.data.users || (Array.isArray(res.data) ? res.data : []);
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchUsers);

const requestRoleChange = (user, role) => {
    if (user.role === role) return;
    roleChangeTarget.value = { user, role };
};

const cancelRoleChange = () => {
    roleChangeTarget.value = null;
};

const confirmRoleChange = async () => {
    if (!roleChangeTarget.value) return;
    const { user, role } = roleChangeTarget.value;

    roleSaving.value = user.id;
    error.value = "";
    try {
        await adminHttp.put(`/users/${user.id}`, { role });
        user.role = role;
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        roleSaving.value = null;
        roleChangeTarget.value = null;
    }
};

const confirmDelete = (user) => {
    deleteTarget.value = user;
};

const deleteUser = async () => {
    if (!deleteTarget.value) return;
    try {
        await adminHttp.delete(`/users/${deleteTarget.value.id}`);
        users.value = users.value.filter((u) => u.id !== deleteTarget.value.id);
        deleteTarget.value = null;
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
        deleteTarget.value = null;
    }
};
</script>

<template>
    <div class="p-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-900">Users</h1>
            <p class="mt-1 text-slate-500">Manage accounts and roles.</p>
        </div>

        <div v-if="error" class="alert bg-red-50 border border-red-200 text-red-700 text-sm mt-6">
            <span>⚠️ {{ error }}</span>
        </div>

        <div class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="table min-w-[720px]">
                    <thead>
                        <tr class="text-slate-500 text-xs uppercase whitespace-nowrap bg-slate-50">
                            <th>User</th>
                            <th>Email</th>
                            <th>Provider</th>
                            <th>Role</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading">
                            <td colspan="5" class="text-center py-10">
                                <span class="loading loading-spinner loading-md text-red-600"></span>
                            </td>
                        </tr>

                        <tr v-else-if="users.length === 0">
                            <td colspan="5" class="text-center py-10 text-slate-400">
                                No data found.
                            </td>
                        </tr>

                        <tr v-for="user in users" :key="user.id" class="hover whitespace-nowrap">
                            <td>
                                <div class="flex items-center gap-3">
                                    <div class="avatar placeholder">
                                        <div class="w-8 h-8 rounded-full bg-red-100 text-red-700 ring-1 ring-red-200 flex items-center justify-center">
                                            <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.name"
                                                class="w-full h-full rounded-full object-cover" />
                                            <span v-else class="text-xs font-semibold leading-none">
                                                {{ (user.name || "?").charAt(0).toUpperCase() }}
                                            </span>
                                        </div>
                                    </div>
                                    <span class="font-medium text-slate-900">{{ user.name }}</span>
                                </div>
                            </td>
                            <td class="text-slate-600">{{ user.email }}</td>
                            <td class="text-slate-600">{{ user.provider || "local" }}</td>
                            <td>
                                <select class="select select-bordered select-xs bg-gray-100 text-gray-900" :value="user.role"
                                    :disabled="roleSaving === user.id"
                                    @change="requestRoleChange(user, $event.target.value)">
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </td>
                            <td class="text-right">
                                <button class="btn btn-xs btn-ghost text-red-600" @click="confirmDelete(user)">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Role Change Confirm Modal -->
        <dialog class="modal" :class="{ 'modal-open': !!roleChangeTarget }">
            <div class="modal-box bg-white text-slate-800">
                <h3 class="text-lg font-bold text-slate-900">Change Role</h3>
                <p class="mt-3 text-slate-600">
                    Change <span class="font-semibold">{{ roleChangeTarget?.user?.name }}</span>'s role from
                    <span class="badge badge-ghost badge-sm">{{ roleChangeTarget?.user?.role }}</span>
                    to
                    <span class="badge badge-sm bg-red-600 text-white border-none">{{ roleChangeTarget?.role }}</span>?
                </p>

                <div class="modal-action">
                    <button class="btn btn-dark" @click="cancelRoleChange">Cancel</button>
                    <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="confirmRoleChange">
                        Confirm
                    </button>
                </div>
            </div>

            <form method="dialog" class="modal-backdrop" @click="cancelRoleChange">
                <button>close</button>
            </form>
        </dialog>

        <!-- Delete Confirm Modal -->
        <dialog class="modal" :class="{ 'modal-open': !!deleteTarget }">
            <div class="modal-box bg-white text-slate-800">
                <h3 class="text-lg font-bold text-slate-900">Delete User</h3>
                <p class="mt-3 text-slate-600">
                    Are you sure you want to delete
                    <span class="font-semibold">{{ deleteTarget?.name }}</span>? This cannot be undone.
                </p>

                <div class="modal-action">
                    <button class="btn btn-dark" @click="deleteTarget = null">Cancel</button>
                    <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="deleteUser">
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
