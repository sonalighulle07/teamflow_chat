export async function createMeeting(payload) {
  const res = await fetch("http://localhost:3000/api/meetings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function getMeeting(code) {
  const res = await fetch(`http://localhost:3000/api/meetings/${code}`);
  return await res.json();
}

export async function getUserMeetings(userId) {
  const res = await fetch(`http://localhost:3000/api/meetings/user/${userId}`);
  return await res.json();
}
