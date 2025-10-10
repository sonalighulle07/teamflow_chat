export async function createMeeting(payload) {
  try {
    const res = await fetch("http://localhost:3000/api/meetings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create meeting");
    return await res.json();
  } catch (err) {
    console.error(" createMeeting error:", err);
    return null;
  }
}

export async function getMeeting(code) {
  try {
    const res = await fetch(`http://localhost:3000/api/meetings/${code}`);
    if (!res.ok) throw new Error("Failed to fetch meeting");
    return await res.json();
  } catch (err) {
    console.error(" getMeeting error:", err);
    return null;
  }
}

export async function getUserMeetings(userId) {
  try {
    const res = await fetch(`http://localhost:3000/api/meetings/user/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch user meetings");
    return await res.json();
  } catch (err) {
    console.error(" getUserMeetings error:", err);
    return null;
  }
}

