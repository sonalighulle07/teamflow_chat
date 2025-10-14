const Event = require('../../models/Event');
 
module.exports = (io, socket) => {
  // Create Event
  socket.on('createEvent', async (data) => {
    try {
      const event = await Event.create(data);
      io.emit('newEvent', event);
    } catch (err) {
      console.error('Create Event failed:', err);
    }
  });
 
  // Update Event
  socket.on('updateEvent', async (data) => {
    try {
      const event = await Event.update(data.id, data);
      io.emit('updateEvent', event);
    } catch (err) {
      console.error('Update Event failed:', err);
    }
  });
 
  // Delete Event
  socket.on('deleteEvent', async (id) => {
    try {
      await Event.delete(id);
      io.emit('deleteEvent', id);
    } catch (err) {
      console.error('Delete Event failed:', err);
    }
  });
};
 
 