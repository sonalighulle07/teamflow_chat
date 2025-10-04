import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createMeeting } from "./meetingUtils";

export default function CreateMeetingModal({ userId }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [scheduledAt, setScheduledAt] = useState(new Date());
  const [meetingLink, setMeetingLink] = useState("");

  const handleCreate = async () => {
    const res = await createMeeting({ hostId: userId, title, scheduledAt, type });
    setMeetingLink(res.link);
  };

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-md">
      <h2 className="text-lg font-semibold mb-2">Create a Meeting</h2>
      <input
        type="text"
        placeholder="Meeting title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      />
      <DatePicker
        selected={scheduledAt}
        onChange={(date) => setScheduledAt(date)}
        showTimeSelect
        dateFormat="Pp"
        className="w-full mb-2 p-2 border rounded"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      >
        <option value="video">Video</option>
        <option value="audio">Audio</option>
      </select>
      <button
        onClick={handleCreate}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        Generate Link
      </button>

      {meetingLink && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">Sharable Link:</p>
          <a
            href={meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all"
          >
            {meetingLink}
          </a>
        </div>
      )}
    </div>
  );
}

