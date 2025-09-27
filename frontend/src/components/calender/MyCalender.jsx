import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './MyCalendar.css'; // local CSS overrides default styles

const localizer = momentLocalizer(moment);

const myEventsList = [
  { start: new Date(2025, 8, 28, 10), end: new Date(2025, 8, 28, 11), title: "Team Meeting" },
  { start: new Date(2025, 8, 29, 13), end: new Date(2025, 8, 29, 14), title: "Project Call" },
];

export default function MyCalendar() {
  return (
    <div className="calendar-container">
      <Calendar
        localizer={localizer}
        events={myEventsList}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={['week', 'day', 'month']}
        step={30}
        showMultiDayTimes
        style={{ height: '100%', minHeight: '600px' }}
      />
    </div>
  );
}
