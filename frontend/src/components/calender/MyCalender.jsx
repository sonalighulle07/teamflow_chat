import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const URL = "http://localhost:3000/api/events"; // adjust backend URL

// 🌈 Event Component
const EventComponent = ({ event, onEdit, onDelete }) => {
  const [hover, setHover] = useState(false);
  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);

  let bgClass =
    "bg-indigo-500/90 border-l-4 border-indigo-700 text-white font-semibold rounded-lg shadow-md px-2 py-1 transition-all backdrop-blur-md";

  if (end < now) {
    bgClass =
      "bg-red-500/90 border-l-4 border-red-700 text-white font-semibold rounded-lg shadow-md px-2 py-1 line-through opacity-80 backdrop-blur-md";
  } else if (start <= now && now <= end) {
    bgClass =
      "bg-green-500/90 border-l-4 border-green-700 text-white font-semibold rounded-lg shadow-md px-2 py-1 transform scale-[1.03] backdrop-blur-md";
  }

  return (
    <div
      className={`${bgClass} relative cursor-pointer`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>{event.title}</span>

      {hover && (
        <div
          className="absolute top-1 right-1 flex gap-1 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="bg-yellow-300 text-black text-xs px-2 py-0.5 rounded hover:bg-yellow-400 shadow-sm"
            onClick={() => onEdit(event)}
          >
            Edit
          </button>
          <button
            className="bg-red-600 text-white text-xs px-2 py-0.5 rounded hover:bg-red-700 shadow-sm"
            onClick={() => onDelete(event)}
          >
            Del
          </button>
        </div>
      )}
    </div>
  );
};

// 🧭 Custom Toolbar
const CustomToolbar = ({ label, onNavigate, onView }) => (
  <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-xl shadow-md">
    <div className="flex gap-2">
      <button
        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => onNavigate("PREV")}
      >
        Prev
      </button>
      <button
        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => onNavigate("TODAY")}
      >
        Today
      </button>
      <button
        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => onNavigate("NEXT")}
      >
        Next
      </button>
    </div>

    <span className="font-bold text-lg">{label}</span>

    <div className="flex gap-2">
      <button
        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => onView(Views.MONTH)}
      >
        Month
      </button>
      <button
        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => onView(Views.WEEK)}
      >
        Week
      </button>
      <button
        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => onView(Views.DAY)}
      >
        Day
      </button>
    </div>
  </div>
);

export default function MyCalendar() {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(URL);
      const data = res.data.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const handleSelectSlot = ({ start, end }) => {
    setIsEditing(false);
    setSelectedEvent(null);
    setTitle("");
    setStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndDate(format(end, "yyyy-MM-dd'T'HH:mm"));
    setShowModal(true);
  };

  const handleEditEvent = (event) => {
    setIsEditing(true);
    setSelectedEvent(event);
    setTitle(event.title);
    setStartDate(format(event.start, "yyyy-MM-dd'T'HH:mm"));
    setEndDate(format(event.end, "yyyy-MM-dd'T'HH:mm"));
    setShowModal(true);
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(`${URL}/${event.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event.");
    }
  };

  const handleSave = async () => {
    if (!title) {
      alert("Please enter a title.");
      return;
    }

    try {
      if (isEditing && selectedEvent) {
        const res = await axios.put(`${URL}/${selectedEvent.id}`, {
          title,
          start: new Date(startDate),
          end: new Date(endDate),
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEvent.id
              ? {
                  ...res.data,
                  start: new Date(res.data.start),
                  end: new Date(res.data.end),
                }
              : e
          )
        );
      } else {
        const res = await axios.post(URL, {
          title,
          start: new Date(startDate),
          end: new Date(endDate),
        });
        setEvents((prev) => [
          ...prev,
          {
            ...res.data,
            start: new Date(res.data.start),
            end: new Date(res.data.end),
          },
        ]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Failed to save event.");
    }
  };

  return (
    <div className="min-h-screen p-6 flex justify-center mt-[5px]">
      <div className="bg-white mb-[20px] mt-[10px]  rounded-3xl p-6 w-[950px] border border-gray-200">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          date={currentDate}
          onView={(view) => setCurrentView(view)}
          onNavigate={(date) => setCurrentDate(date)}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleEditEvent}
          components={{
            event: ({ event }) => (
              <EventComponent
                event={event}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            ),
            toolbar: (props) => <CustomToolbar {...props} />,
          }}
          style={{ height: "85vh" }}
        />
      </div>

      {/* 🌟 Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-1/2 max-w-3xl">
            <h2 className="text-2xl font-semibold mb-6">
              {isEditing ? "Edit Event" : "Add New Event"}
            </h2>

            <label className="block mb-2 text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <label className="block mb-2 text-sm font-medium">Start</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <label className="block mb-2 text-sm font-medium">End</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-6"
            />

            <div className="flex justify-end gap-4">
              {isEditing && (
                <button
                  onClick={() => handleDeleteEvent(selectedEvent)}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-5 py-2 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700"
              >
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
