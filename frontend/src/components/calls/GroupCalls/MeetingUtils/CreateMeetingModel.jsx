import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createMeeting } from "./meetingUtils";
import { setActiveNav } from "../../../../Store/Features/Users/userSlice";
import { useDispatch } from "react-redux";
import {
  FaVideo,
  FaMicrophone,
  FaLink,
  FaCopy,
  FaCalendarAlt,
  FaShieldAlt, // Added for the controlled icon
  FaUsers, // Added for the open icon
} from "react-icons/fa";

export default function CreateMeetingModal({ userId }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [scheduledAt, setScheduledAt] = useState(new Date());
  const [meetingLink, setMeetingLink] = useState("");
  const [copied, setCopied] = useState(false);
  // ✅ NEW STATE: To store the permission setting (true for Controlled, false for Open)
  const [is_controlled, setIsControlled] = useState(false); 
  const dispatch = useDispatch();

  const handleCreate = async () => {
    console.log("Button clicked...");
    
    // ✅ PASS isControlled TO THE UTILITY FUNCTION
   const res = await createMeeting({
  hostId: userId,
  title,
  scheduledAt: scheduledAt
    ? scheduledAt.toISOString().slice(0, 19).replace("T", " ")
    : null,
  type,
  is_controlled,
});

    
    setMeetingLink(res.link);
    console.log(meetingLink);
    // Optionally, clear form fields after creation
    // setTitle(""); 
    // setScheduledAt(new Date());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewCalendar = () => {
    dispatch(setActiveNav("Calendar")); // Switch main view to Calendar
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 transition-all hover:shadow-purple-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
        Create a Meeting
      </h2>

      {/* Meeting Title */}
      <label className="block text-gray-600 mb-2 font-medium">
        Meeting Title
      </label>
      <input
        type="text"
        placeholder="Enter meeting title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-4 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      {/* Date & Time */}
      <label className="block text-gray-600 mb-2 font-medium">
        Schedule Date & Time
      </label>
      <DatePicker
        selected={scheduledAt}
        onChange={(date) => setScheduledAt(date)}
        showTimeSelect
        dateFormat="Pp"
        className="w-full mb-4 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      {/* Meeting Type */}
      <label className="block text-gray-600 mb-2 font-medium">
        Meeting Type
      </label>
      <div className="relative mb-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full appearance-none p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="video">Video Meeting</option>
          <option value="audio">Audio Meeting</option>
        </select>
        <div className="absolute top-3 right-4 text-gray-400">
          {type === "video" ? <FaVideo /> : <FaMicrophone />}
        </div>
      </div>

      {/* ✅ NEW: Stream Sharing Permission (Controlled/Open) */}
      <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-purple-50">
        <div className="flex items-center">
          <input
            id="isControlled-toggle"
            type="checkbox"
            checked={is_controlled}
            onChange={(e) => setIsControlled(e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <label htmlFor="isControlled-toggle" className="ml-3 text-gray-700 font-medium cursor-pointer">
            Controlled Stream Sharing
          </label>
        </div>
        
        <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
          {is_controlled ? (
            <>
              <FaShieldAlt className="text-red-500" />
              **Controlled:** Only the meeting host can share their screen.
            </>
          ) : (
            <>
              <FaUsers className="text-green-600" />
              **Open:** All participants can share their screen.
            </>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCreate}
          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all"
        >
          Generate Meeting Link
        </button>

        <button
          onClick={handleViewCalendar}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-purple-500 text-purple-700 hover:bg-purple-50 font-semibold py-3 rounded-lg shadow-sm transition-all"
        >
          <FaCalendarAlt className="text-purple-600" />
          View Calendar
        </button>
      </div>

      {/* Meeting Link Display */}
      {meetingLink && (
        <div className="mt-8 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaLink className="text-purple-600" />
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 font-medium underline break-all hover:text-purple-900"
            >
              {meetingLink}
            </a>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg transition-all"
          >
            <FaCopy />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}