
import { useState, useEffect } from "react";
import "./App.css";

const API = "https://campus-track-mse5.onrender.com/api";

const emptyTask = {
  title: "",
  subject: "",
  description: "",
  dueDate: "",
  priority: "medium",
  status: "todo",
  tags: ""
};

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [name, setName] = useState(
    localStorage.getItem("name") || "Student"
  );

  const [register, setRegister] = useState(false);
  const [auth, setAuth] = useState({
    name: "", email: "", password: ""
  });

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [form, setForm] = useState(emptyTask);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    setToken("");
    setTasks([]);
    setStats({});
    setMessage("");
    setShowForm(false);
    setEditing(null);
    setForm(emptyTask);
  }

  async function request(path, options = {}) {
    const res = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? {
          Authorization: `Bearer ${token}`
        } : {})
      }
    });

    if (res.status === 204) return null;

    const data = await res.json();

    if (res.status === 401 && token) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok || data.success === false) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function handleAuth(e) {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      const data = await request(
        register ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(
            register ? auth : {
              email: auth.email,
              password: auth.password
            }
          )
        }
      );

      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.user.name);
      setName(data.user.name);
      setToken(data.token);
      setAuth({ name: "", email: "", password: "" });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadTasks() {
    try {
      const query = new URLSearchParams({
        search,
        limit: "100"
      });

      if (status) query.set("status", status);
      if (priority) query.set("priority", priority);

      const data = await request("/tasks?" + query);
      let allTasks = data.tasks;

      for (let page = 2; page <= data.totalPages; page++) {
        query.set("page", String(page));
        const next = await request("/tasks?" + query);
        allTasks = [...allTasks, ...next.tasks];
      }

      setTasks(allTasks);

      const result = await request("/tasks/stats");
      setStats(result.statistics);
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => {
    if (token) loadTasks();
  }, [token, search, status, priority]);

  async function saveTask(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || null,
        tags: form.tags.split(",")
          .map(t => t.trim()).filter(Boolean)
      };

      await request(
        editing ? `/tasks/${editing}` : "/tasks",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );

      setForm(emptyTask);
      setEditing(null);
      setShowForm(false);
      await loadTasks();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editTask(task) {
    setEditing(task._id);
    setForm({
      title: task.title,
      subject: task.subject,
      description: task.description || "",
      dueDate: task.dueDate
        ? task.dueDate.slice(0, 10) : "",
      priority: task.priority,
      status: task.status,
      tags: (task.tags || []).join(", ")
    });
    setShowForm(true);
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this assignment?")) return;

    try {
      await request(`/tasks/${id}`, {
        method: "DELETE"
      });
      await loadTasks();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function changeStatus(id, newStatus) {
    try {
      await request(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      await loadTasks();
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>CampusTrack</h1>
          <p>Student Assignment & Deadline Management</p>

          <h2>{register ? "Create Account" : "Welcome Back"}</h2>

          <form onSubmit={handleAuth}>
            {register && (
              <input
                placeholder="Full Name"
                required
                value={auth.name}
                onChange={e => setAuth({
                  ...auth, name: e.target.value
                })}
              />
            )}

            <input
              type="email"
              placeholder="Email Address"
              required
              value={auth.email}
              onChange={e => setAuth({
                ...auth, email: e.target.value
              })}
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={auth.password}
              onChange={e => setAuth({
                ...auth, password: e.target.value
              })}
            />

            <button disabled={busy}>
              {busy ? "Please wait..." :
                register ? "Register" : "Login"}
            </button>
          </form>

          {message && <p className="error">{message}</p>}

          <p>{register
            ? "Already have an account?"
            : "Don't have an account?"}</p>

          <button className="outline" onClick={() => {
            setRegister(!register);
            setMessage("");
          }}>
            {register ? "Login" : "Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header>
        <div>
          <h2>CampusTrack</h2>
          <small>Student Workspace</small>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      <main>
        <div className="welcome">
          <div>
            <h1>Welcome, {name}!</h1>
            <p>Stay organized. Never miss a deadline.</p>
          </div>

          <button onClick={() => {
            setForm(emptyTask);
            setEditing(null);
            setShowForm(true);
          }}>
            + Add Assignment
          </button>
        </div>

        <div className="stats">
          {[
            ["Total Assignments", stats.total, "total"],
            ["Pending", stats.pending, "pending"],
            ["In Progress", stats.inProgress, "progress"],
            ["Completed", stats.completed, "completed"]
          ].map(([label, value, cls]) => (
            <div className={`stat ${cls}`} key={label}>
              <p>{label}</p>
              <h1>{value || 0}</h1>
            </div>
          ))}
        </div>

        {message && <p className="error">{message}</p>}

        {showForm && (
          <div className="form-card">
            <h2>{editing
              ? "Edit Assignment"
              : "New Assignment"}</h2>

            <form onSubmit={saveTask}>
              <input
                placeholder="Assignment Title"
                required
                maxLength={100}
                value={form.title}
                onChange={e => setForm({
                  ...form, title: e.target.value
                })}
              />

              <input
                placeholder="Subject"
                required
                maxLength={100}
                value={form.subject}
                onChange={e => setForm({
                  ...form, subject: e.target.value
                })}
              />

              <textarea
                placeholder="Description"
                maxLength={1000}
                value={form.description}
                onChange={e => setForm({
                  ...form, description: e.target.value
                })}
              />

              <label>Deadline</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({
                  ...form, dueDate: e.target.value
                })}
              />

              <label>Priority</label>
              <select value={form.priority}
                onChange={e => setForm({
                  ...form, priority: e.target.value
                })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <label>Status</label>
              <select value={form.status}
                onChange={e => setForm({
                  ...form, status: e.target.value
                })}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Completed</option>
              </select>

              <input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={e => setForm({
                  ...form, tags: e.target.value
                })}
              />

              <div className="actions">
                <button disabled={busy}>
                  {busy ? "Saving..." : "Save Assignment"}
                </button>

                <button type="button" className="outline"
                  onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <h2>My Assignments</h2>

        <div className="filters">
          <input
            placeholder="Search assignments or subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select value={status}
            onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Completed</option>
          </select>

          <select value={priority}
            onChange={e => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="task-grid">
          {tasks.length === 0 && (
            <p>No assignments found.</p>
          )}

          {tasks.map(task => (
            <div className="task-card" key={task._id}>
              <span className={`badge ${task.priority}`}>
                {task.priority} priority
              </span>

              <h2>{task.title}</h2>
              <h4>{task.subject}</h4>
              <p>{task.description}</p>

              <p>
                Deadline: {task.dueDate
                  ? task.dueDate.slice(0, 10)
                  : "Not specified"}
              </p>

              <p>{(task.tags || []).join(" • ")}</p>

              <select value={task.status}
                onChange={e =>
                  changeStatus(task._id, e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Completed</option>
              </select>

              <div className="actions">
                <button className="outline"
                  onClick={() => editTask(task)}>
                  Edit
                </button>

                <button className="danger"
                  onClick={() => deleteTask(task._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
