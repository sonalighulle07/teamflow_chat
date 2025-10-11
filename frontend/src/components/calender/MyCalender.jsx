import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { URL } from "../../config";
import { FaChevronLeft, FaChevronRight, FaCalendarDay } from "react-icons/fa";

const localizer = momentLocalizer(moment);

// Event component with hover actions and modern styling
const EventComponent = ({ event, onEdit, onDelete }) => {
  const [hover, setHover] = useState(false);

  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);

  // Conditional background colors
  let bgStyle = {
    backgroundColor: "#6366f1",
    color: "white",
    fontWeight: 500,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    borderLeft: "4px solid #4338ca",
    borderRadius: "0.5rem",
    transition: "all 0.3s ease",
    position: "relative",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
  };

  if (end < now) {
    // Past event - red gradient
    bgStyle = {
      ...bgStyle,
      background: "linear-gradient(135deg, #f87171, #dc2626)",
      borderLeft: "4px solid #b91c1c",
      textDecoration: "line-through",
      opacity: 0.85,
    };
  } else if (start <= now && now <= end) {
    // Current/active event - green gradient
    bgStyle = {
      ...bgStyle,
      background: "linear-gradient(135deg, #4ade80, #16a34a)",
      borderLeft: "4px solid #15803d",
      transform: "scale(1.03)",
    };
  }

  return (
    <div
      style={bgStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>{event.title}</span>

      {hover && (
        <div
          className="absolute top-1 right-1 flex space-x-1 z-10"
          onClick={(e) => e.stopPropagation()} // stops clicks from bubbling
        >
          <button
            className="bg-yellow-400 text-black px-2 py-0.5 rounded hover:bg-yellow-500 text-xs font-semibold shadow"
            onClick={() => onEdit(event)}
          >
            Edit
          </button>
          <button
            className="bg-red-500 px-2 py-0.5 rounded hover:bg-red-600 text-xs font-semibold shadow"
            onClick={() => onDelete(event)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Modern Toolbar
const CustomToolbar = ({ label, onNavigate, onView }) => (
  <div className="flex flex-col md:flex-row justify-between items-center mb-4 p-3 bg-white shadow-lg rounded-lg">
    <div className="flex items-center space-x-2 mb-2 md:mb-0">
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center space-x-1 shadow"
        onClick={() => onNavigate("PREV")}
      >
        <FaChevronLeft /> <span>Prev</span>
      </button>
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center space-x-1 shadow"
        onClick={() => onNavigate("TODAY")}
      >
        <FaCalendarDay /> <span>Today</span>
      </button>
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center space-x-1 shadow"
        onClick={() => onNavigate("NEXT")}
      >
        <FaChevronRight /> <span>Next</span>
      </button>
    </div>

    <span className="text-gray-800 font-bold text-lg">{label}</span>

    <div className="flex space-x-2 mt-2 md:mt-0">
      <button
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 shadow"
        onClick={() => onView(Views.MONTH)}
      >
        Month
      </button>
      <button
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 shadow"
        onClick={() => onView(Views.WEEK)}
      >
        Week
      </button>
      <button
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 shadow"
        onClick={() => onView(Views.DAY)}
      >
        Day
      </button>
    </div>
  </div>
);

export default function MyCalendar() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${URL}/api/events`);
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

  const handleSelectSlot = async ({ start, end }) => {
    const title = prompt("Enter event title:");
    if (!title) return;

    try {
      const res = await axios.post(`${URL}/api/events`, {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
      });

      setEvents((prev) => [
        ...prev,
        {
          ...res.data,
          start: new Date(res.data.start),
          end: new Date(res.data.end),
        },
      ]);
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Failed to create event.");
    }
  };

  const handleEditEvent = async (event) => {
    const title = prompt("Enter new title:", event.title);
    if (!title) return;

    try {
      const res = await axios.put(`${URL}/api/events/${event.id}`, {
        title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? {
                ...res.data,
                start: new Date(res.data.start),
                end: new Date(res.data.end),
              }
            : e
        )
      );
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Failed to update event.");
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await axios.delete(`${URL}/api/events/${event.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event.");
    }
  };

  return (
    <div className="w-full h-screen p-4 mr-[200px] bg-gray-100">
      <div className="w-full h-full bg-white rounded-lg shadow-lg p-6">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          selectable
          onSelectSlot={handleSelectSlot}
          components={{
            event: ({ event }) => (
              <EventComponent
                event={event}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            ),
            toolbar: CustomToolbar,
          }}
          style={{ height: "85vh" }}
        />
      </div>
    </div>
  );
}
