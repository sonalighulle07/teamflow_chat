import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import socket from "../calls/hooks/socket";
 
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
const URL = "http://localhost:3000/api/events";
 
//  Event Component
const EventComponent = ({ event, onEdit, onDelete }) => {
  const [hover, setHover] = React.useState(false);
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
 
//  Custom Toolbar
const CustomToolbar = ({ label, onNavigate, onView, view }) => {
  const [activeView, setActiveView] = useState(view);
  const [activeNav, setActiveNav] = useState("TODAY");
  useEffect(() => setActiveView(view), [view]);
 
  const navButtonClass = (nav) =>
    `flex items-center gap-1 px-2 py-1  text-[15px] rounded-lg shadow-sm transition duration-200 ${
      activeNav === nav
        ? "bg-indigo-600 text-white hover:bg-indigo-700"
        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }`;
 
  const viewButtonClass = (v) =>
    `px-2 py-1  text-[15px] rounded-lg shadow-sm transition duration-200 ${
      activeView === v
        ? "bg-indigo-600 text-white hover:bg-indigo-700"
        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }`;
 
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-3 p-3 bg-white rounded-[10px] shadow-lg border border-gray-200">
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
      <span className="font-semibold text-lg text-gray-800 mb-2 md:mb-0">
        {label}
      </span>
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
 
//  Main Calendar Component
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
 
  //  Fetch events
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
 
  useEffect(() => {
    fetchEvents();
    //  Listen to Socket.IO updates
    socket.on("eventCreated", fetchEvents);
    socket.on("eventUpdated", fetchEvents);
    socket.on("eventDeleted", fetchEvents);
 
    return () => {
      socket.off("eventCreated");
      socket.off("eventUpdated");
      socket.off("eventDeleted");
    };
  }, []);
 
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
 
  const handleSave = async () => {
    if (!title) return alert("Please enter a title.");
 
    try {
      if (isEditing && selectedEvent) {
        await axios.put(`${URL}/${selectedEvent.id}`, {
          title,
          start: new Date(startDate),
          end: new Date(endDate),
        });
      } else {
        await axios.post(URL, {
          title,
          start: new Date(startDate),
          end: new Date(endDate),
        });
      }
      setShowModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save event.");
    }
  };
 
  const handleDeleteEvent = async (event) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(`${URL}/${event.id}`);
      setShowModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete event.");
    }
  };
 
  return (
    <div className="min-h-screen p-6 flex justify-center mt-[10px]">
      <div className="mb-[20px] mt-[10px] rounded-3xl p-2 w-[950px] ">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          date={currentDate}
          onView={setCurrentView}
          onNavigate={setCurrentDate}
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
 
     {showModal && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-start pt-19 z-50">
    <div className="bg-white rounded-xl shadow-lg w-full max-w-[450px] p-8 border border-gray-100">

      {/* Header */}
      <h2 className="text-base text-center font-semibold text-gray-700 mb-6">
        {isEditing ? "Update Event" : "Add Event"}
      </h2>

      <div className="space-y-4 mt-4">
        {/* Title */}
        <div>
          <label className="block text-sm text-gray-600 font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter event title"
            className="w-full px-3 py-2 mt-1 mb-1 text-sm border border-gray-300 rounded-md
              placeholder:text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm text-gray-600 font-medium mb-1">
            Start Date & Time
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 mt-1 mb-1 text-sm border border-gray-300 rounded-md
              focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm text-gray-600 font-medium mb-1">
            End Date & Time
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 mt-1 mb-1 text-sm border border-gray-300 rounded-md
              focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-6">
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="flex-1 py-2 text-sm font-medium rounded-md
            bg-gray-200 text-gray-700 hover:bg-gray-300  transition"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          className="flex-1 py-2 text-sm font-medium rounded-md
            bg-[rgb(106,109,213)] hover:bg-[rgb(93,96,194)]
            text-white transition"
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