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
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

export default function CreateMeetingModal({ userId }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [scheduledAt, setScheduledAt] = useState(new Date());
  const [meetingLink, setMeetingLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [is_controlled, setIsControlled] = useState(false);

  const dispatch = useDispatch();

  const handleCreate = async () => {
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
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewCalendar = () => {
    dispatch(setActiveNav("Calendar"));
  };

  const inputStyle =
    "w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500";

 return (
  <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-gray-100">
    <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
      Create a Meeting
    </h2>

    {/* Meeting Title */}
    <label className="block text-gray-600 mb-1 text-sm font-medium">
      Title
    </label>
    <input
      type="text"
      placeholder="Enter meeting title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      className={inputStyle}
    />

    {/* Date & Time */}
    <label className="block text-gray-600 mt-3 mb-1 text-sm font-medium">
      Schedule Date & Time
    </label>
    <DatePicker
      selected={scheduledAt}
      onChange={(date) => setScheduledAt(date)}
      showTimeSelect
      dateFormat="Pp"
      className={inputStyle}
    />

    {/* Meeting Type */}
    <label className="block text-gray-600 mt-3 mb-1 text-sm font-medium">
      Type
    </label>
    <div className="relative mb-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
      >
        <option value="video">Video Meeting</option>
        <option value="audio">Audio Meeting</option>
      </select>
      <div className="absolute top-2.5 right-3 text-gray-400 text-sm">
        {type === "video" ? <FaVideo /> : <FaMicrophone />}
      </div>
    </div>

    {/* Stream Sharing Permission */}
    <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-purple-50">
      <div className="flex items-center">
        <input
          id="isControlled-toggle"
          type="checkbox"
          checked={is_controlled}
          onChange={(e) => setIsControlled(e.target.checked)}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded"
        />
        <label
          htmlFor="isControlled-toggle"
          className="ml-2 text-sm text-gray-700 font-medium cursor-pointer"
        >
          Controlled Stream Sharing
        </label>
      </div>

      <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
        {is_controlled ? (
          <>
            <FaShieldAlt className="text-red-500" />
            Only host can share screen
          </>
        ) : (
          <>
            <FaUsers className="text-green-600" />
            All participants can share screen
          </>
        )}
      </div>
    </div>

    {/* Buttons */}
    <div className="flex gap-3">
      <button
  onClick={handleCreate}
  className="flex-1 flex items-center justify-center gap-2
    bg-[rgb(106,109,213)] hover:bg-[rgb(93,96,194)]
    text-white hover:text-white
    text-sm font-medium py-2 rounded-md transition"
>
  <FaLink className="text-sm" />
  Generate Link
</button>

      <button
        onClick={handleViewCalendar}
        className="flex-1 flex items-center justify-center gap-2 border bg-[rgb(106,109,213)] hover:bg-[rgb(93,96,194)]  text-white  text-sm font-medium py-2 rounded-md transition"
      >
        <FaCalendarAlt />
        Calendar
      </button>
    </div>

    {/* Meeting Link */}
    {meetingLink && (
      <div className="mt-5 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <FaLink className="text-purple-600" />
          <a
            href={meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[rgb(106,109,213)]  underline break-all"
          >
            {meetingLink}
          </a>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs bg-purple-100 hover:bg-purple-200 text-[rgb(106,109,213)] px-2 py-1 rounded-md"
        >
          <FaCopy />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    )}
  </div>
);

}
