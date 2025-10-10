import { useEffect, useState } from "react";
import { getUserMeetings } from "../services/MeetingService";

export default function MeetingCalendar({ userId }) {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    async function fetchMeetings() {
      const data = await getUserMeetings(userId);
      setMeetings(data);
    }
    fetchMeetings();
  }, [userId]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Upcoming Meetings</h2>
      <ul className="space-y-2">
        {meetings.map((m) => (
          <li key={m.code} className="bg-white p-3 rounded shadow">
            <div className="font-medium">{m.title}</div>
            <div className="text-sm text-gray-600">
              {new Date(m.scheduled_at).toLocaleString()}
            </div>
            <a
              href={`/meet/${m.code}`}
              className="text-blue-600 underline text-sm"
            >
              Join Meeting
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
