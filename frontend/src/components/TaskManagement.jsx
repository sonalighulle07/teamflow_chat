import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { URL } from "../config";

export default function TaskManagement() {
  const { userList = [] } = useSelector((state) => state.user || {});
  const token = sessionStorage.getItem("chatToken");
  const currentUserId = sessionStorage.getItem("userId");

  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    assigned_to: "",
    due_date: "",
    status: "Pending",
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTaskList(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err.response?.data || err.message);
      setTaskList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("Title is required");
    if (!form.assigned_to) return alert("Please assign a user");

    try {
      const payload = { ...form, assigned_by: currentUserId };
      if (editingId) {
        await axios.put(`${URL}/api/tasks/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEditingId(null);
      } else {
        await axios.post(`${URL}/api/tasks`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setForm({ title: "", assigned_to: "", due_date: "", status: "Pending" });
      fetchTasks();
    } catch (err) {
      console.error("Failed to save task:", err.response?.data || err.message);
      alert("Failed to save task");
    }
  };

  const handleEdit = (task) => {
    setForm({
      title: task.title,
      assigned_to: task.assigned_to || "",
      due_date: task.due_date ? task.due_date.slice(0, 16) : "",
      status: task.status || "Pending",
    });
    setEditingId(task.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${URL}/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks();
    } catch (err) {
      console.error("Failed to delete task:", err.response?.data || err.message);
      alert("Failed to delete task");
    }
  };

  const getUsernameById = (id) => {
    const user = userList.find((u) => u.id === id);
    return user ? user.username : "Unknown";
  };

  // Filter and paginate
  const filteredTasks = taskList.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUsernameById(t.assigned_to).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Form */}
      <div className="mb-6 p-6 bg-white rounded-2xl shadow-md max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Task Management
        </h1>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          {editingId ? "Edit Task" : "Add Task"}
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Task Title</label>
            <input
              name="title"
              placeholder="Enter task title"
              value={form.title}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Assign User</label>
            <select
              name="assigned_to"
              value={form.assigned_to}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            >
              <option value="">Select user</option>
              {userList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Due Date</label>
            <input
              type="datetime-local"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
          >
            {editingId ? "Update Task" : "Add Task"}
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="p-6 bg-white rounded-2xl shadow-md max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Tasks</h2>
          <input
            type="text"
            placeholder="Search by title or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-gray-500">No tasks found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-indigo-100">
                <tr>
                  {["S.No", "Title", "Assigned To", "Due Date", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedTasks.map((task, index) => (
                  <tr key={task.id} className="hover:bg-indigo-50 transition">
                    <td className="px-3 py-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-3 py-2">{task.title}</td>
                    <td className="px-3 py-2">{getUsernameById(task.assigned_to)}</td>
                    <td className="px-3 py-2">
                      {task.due_date ? new Date(task.due_date).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2">{task.status}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end gap-2 mt-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md transition disabled:opacity-50"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded-md transition ${
                      currentPage === i + 1
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
