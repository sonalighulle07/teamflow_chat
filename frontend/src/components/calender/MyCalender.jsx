import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { FaEdit, FaTrashAlt, FaClock } from "react-icons/fa";

import { FaChevronLeft, FaChevronRight, FaCalendarDay } from "react-icons/fa";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const URL = "http://localhost:3000/api/events"; // adjust backend URL

//  Event Component
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

// Custom Toolbar (Professional UI + Active Button Highlight)
const CustomToolbar = ({ label, onNavigate, onView, view, date }) => {
  const [activeView, setActiveView] = useState(view);
  const [activeNav, setActiveNav] = useState("TODAY");

  // Sync active view when parent changes
  useEffect(() => {
    setActiveView(view);
  }, [view]);

  const navButtonClass = (nav) =>
    `flex items-center gap-1 px-3 py-2 rounded-lg shadow-sm transition duration-200 ${
      activeNav === nav
        ? "bg-indigo-600 text-white hover:bg-indigo-700"
        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }`;

  const viewButtonClass = (v) =>
    `px-3 py-2 rounded-lg shadow-sm transition duration-200 ${
      activeView === v
        ? "bg-indigo-600 text-white hover:bg-indigo-700"
        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }`;

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-4 p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Navigation Buttons */}
      <div className="flex gap-2 mb-2 md:mb-0">
        <button
          className={navButtonClass("PREV")}
          onClick={() => {
            onNavigate("PREV");
            setActiveNav("PREV");
          }}
        >
          <FaChevronLeft /> Prev
        </button>
        <button
          className={navButtonClass("TODAY")}
          onClick={() => {
            onNavigate("TODAY");
            setActiveNav("TODAY");
          }}
        >
          Today
        </button>
        <button
          className={navButtonClass("NEXT")}
          onClick={() => {
            onNavigate("NEXT");
            setActiveNav("NEXT");
          }}
        >
          Next <FaChevronRight />
        </button>
      </div>

      {/* Label */}
      <span className="font-semibold text-lg text-gray-800 mb-2 md:mb-0">
        {label}
      </span>

      {/* View Buttons */}
      <div className="flex gap-2">
        <button
          className={viewButtonClass(Views.MONTH)}
          onClick={() => {
            onView(Views.MONTH);
            setActiveView(Views.MONTH);
          }}
        >
          Month
        </button>
        <button
          className={viewButtonClass(Views.WEEK)}
          onClick={() => {
            onView(Views.WEEK);
            setActiveView(Views.WEEK);
          }}
        >
          Week
        </button>
        <button
          className={viewButtonClass(Views.DAY)}
          onClick={() => {
            onView(Views.DAY);
            setActiveView(Views.DAY);
          }}
        >
          Day
        </button>
      </div>
    </div>
  );
};

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

      {/*  Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-none  flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-white/100 rounded-3xl shadow-2xl border border-gray-200 w-[550px] max-w-3xl p-8 relative overflow-hidden">
            {/* Gradient Accent Bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-3xl"></div>

            {/* Header */}
            <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-6 flex items-center gap-2">
              {isEditing ? "✏️ Edit Event" : "🗓️ Add New Event"}
            </h2>

            {/* Input Fields */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter event title..."
                  className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-xl px-4 py-2.5 text-gray-800 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-xl px-4 py-2.5 text-gray-800 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-xl px-4 py-2.5 text-gray-800 transition-all duration-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              {isEditing && (
                <button
                  onClick={() => handleDeleteEvent(selectedEvent)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition-all duration-200"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-5 py-2.5 rounded-xl shadow-md transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all duration-200"
              >
                {isEditing ? "Update Event" : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
