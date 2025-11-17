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

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTaskList(res.data);
    } catch (err) {
      console.error(
        "Failed to fetch tasks:",
        err.response?.data || err.message
      );
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
      console.error(
        "Failed to delete task:",
        err.response?.data || err.message
      );
      alert("Failed to delete task");
    }
  };

  const getUsernameById = (id) => {
    const user = userList.find((u) => u.id === id);
    return user ? user.username : "Unknown";
  };

  return (
    <div className="p-4 min-h-screen ">
      {/* Form */}
      <div className="mb-6 p-4 bg-white/80 backdrop-blur-md rounded-xl shadow-md max-w-lg mx-auto">
     <h1 className="text-[25px] font-bold mb-6
        text-center">
  Task Management
</h1>

        <h2 className="text-lg font-semibold mb-3 text-gray-700">
          {editingId ? "Edit Task" : "Add Task"}
        </h2>
        <form className="space-y-3" onSubmit={handleSubmit}>
  <div>
    <label className="block text-gray-600 text-sm mb-1">Task Title</label>
    <input
      name="title"
      placeholder="Enter task title"
      value={form.title}
      onChange={handleChange}
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-400 outline-none"
      required
    />
  </div>

  <div>
    <label className="block text-gray-600 text-sm mb-1">Assign User</label>
    <select
      name="assigned_to"
      value={form.assigned_to}
      onChange={handleChange}
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-400 outline-none"
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
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-400 outline-none"
    />
  </div>

  <div>
    <label className="block text-gray-600 text-sm mb-1">Status</label>
    <select
      name="status"
      value={form.status}
      onChange={handleChange}
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-400 outline-none"
    >
      <option>Pending</option>
      <option>In Progress</option>
      <option>Completed</option>
    </select>
  </div>

  <button
    type="submit"
    className="w-full py-2 bg-blue-400 hover:bg-blue-700 text-white font-medium rounded-md transition"
  >
    {editingId ? "Update Task" : "Add Task"}
  </button>
</form>

      </div>

      {/* Task List */}
      <div className="p-4 bg-white/80 backdrop-blur-md rounded-xl shadow-md max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Tasks</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : taskList.length === 0 ? (
          <p className="text-gray-500">No tasks found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-indigo-100">
                <tr>
                  {[
                    "Title",
                    "Assigned To",
                    "Due Date",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {taskList.map((task) => (
                  <tr key={task.id} className="hover:bg-indigo-50 transition">
                    <td className="px-3 py-2">{task.title}</td>
                    <td className="px-3 py-2">
                      {getUsernameById(task.assigned_to)}
                    </td>
                    <td className="px-3 py-2">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2">{task.status}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="px-2 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
