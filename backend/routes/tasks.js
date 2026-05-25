const router = require('express').Router();
const auth = require('../middleware/auth');
const { Task, Comment, Event, Notification } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;

    const tasks = await Task.find({ projectId })
      .sort('order')
      .populate('assigneeId', 'name email avatar')
      .populate('createdBy', 'name avatar')
      .populate('linkedTaskIds', 'title status');

    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user._id
    });

    await Event.create({
      projectId: task.projectId,
      actorId: req.user._id,
      type: 'task:created',
      payload: {
        taskId: task._id,
        title: task.title
      }
    });

    const io = req.app.get('io');

    io.to(`project:${task.projectId}`).emit('task:created', task);

    // FIXED BUG:
    // old.assigneeId does not exist in create route
    if (
      req.body.assigneeId &&
      req.body.assigneeId !== req.user._id.toString()
    ) {
      const notif = await Notification.create({
        userId: req.body.assigneeId,
        type: 'task:assigned',
        message: `You were assigned "${task.title}"`,
        link: `/task/${task._id}`
      });

      io.to(`user:${req.body.assigneeId}`).emit(
        'notification:new',
        notif
      );
    }

    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/bulk', auth, async (req, res) => {
  try {
    const { tasks, projectId } = req.body;
    if (!tasks || !tasks.length) return res.status(400).json({ error: 'No tasks' });
    
    const maxOrderTask = await Task.findOne({ projectId, status: 'todo' }).sort('-order');
    let startOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;
    
    const newTasks = tasks.map((t, i) => ({
      projectId,
      title: t.title,
      description: t.description,
      priority: t.priority || 'P2',
      status: 'todo',
      order: startOrder + i,
      labels: t.labels || [],
      createdBy: req.user._id
    }));
    
    const inserted = await Task.insertMany(newTasks);
    
    const io = req.app.get('io');
    inserted.forEach(t => io.to(`project:${projectId}`).emit('task:created', t));
    
    res.json(inserted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assigneeId', 'name email avatar')
      .populate('createdBy', 'name avatar')
      .populate('linkedTaskIds', 'title status priority');

    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const old = await Task.findById(req.params.id);

    const updates = {
      ...req.body,
      updatedAt: new Date()
    };

    const historyEntry = [];

    if (req.body.status && req.body.status !== old.status) {
      updates.columnEnteredAt = new Date();

      historyEntry.push({
        field: 'status',
        from: old.status,
        to: req.body.status,
        actorId: req.user._id
      });
    }

    if (
      req.body.assigneeId &&
      req.body.assigneeId !== old.assigneeId?.toString()
    ) {
      historyEntry.push({
        field: 'assigneeId',
        from: old.assigneeId?.toString(),
        to: req.body.assigneeId,
        actorId: req.user._id
      });
    }

    if (req.body.priority && req.body.priority !== old.priority) {
      historyEntry.push({
        field: 'priority',
        from: old.priority,
        to: req.body.priority,
        actorId: req.user._id
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        ...updates,
        $push: {
          history: {
            $each: historyEntry
          }
        }
      },
      { new: true }
    ).populate('assigneeId', 'name email avatar');

    if (req.body.status) {
      await Event.create({
        projectId: task.projectId,
        actorId: req.user._id,
        type: 'task:moved',
        payload: {
          taskId: task._id,
          title: task.title,
          from: old.status,
          to: req.body.status
        }
      });
    }

    const io = req.app.get('io');

    io.to(`project:${task.projectId}`).emit('task:updated', task);

    if (
      req.body.assigneeId &&
      req.body.assigneeId !== req.user._id.toString() &&
      req.body.assigneeId !== old.assigneeId?.toString()
    ) {
      const notif = await Notification.create({
        userId: req.body.assigneeId,
        type: 'task:assigned',
        message: `You were assigned "${task.title}"`,
        link: `/task/${task._id}`
      });

      io.to(`user:${req.body.assigneeId}`).emit(
        'notification:new',
        notif
      );
    }

    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const io = req.app.get('io');

    io.to(`project:${task.projectId}`).emit('task:deleted', {
      _id: req.params.id
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({
      taskId: req.params.id
    }).populate('authorId', 'name avatar');

    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { body, mentions } = req.body;

    const comment = await Comment.create({
      taskId: req.params.id,
      authorId: req.user._id,
      body,
      mentions
    });

    await comment.populate('authorId', 'name avatar');

    const task = await Task.findById(req.params.id);

    await Event.create({
      projectId: task.projectId,
      actorId: req.user._id,
      type: 'comment:added',
      payload: {
        taskId: req.params.id,
        taskTitle: task.title
      }
    });

    const io = req.app.get('io');

    if (mentions && mentions.length > 0) {
      for (const userId of mentions) {
        if (userId !== req.user._id.toString()) {
          const notif = await Notification.create({
            userId,
            type: 'mention',
            message: `${req.user.name} mentioned you in "${task.title}"`,
            link: `/task/${req.params.id}`
          });

          io.to(`user:${userId}`).emit(
            'notification:new',
            notif
          );
        }
      }
    }

    io.to(`project:${task.projectId}`).emit(
      'comment:new',
      comment
    );

    res.json(comment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/reorder', auth, async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const bulkOps = tasks.map((t) => ({
      updateOne: {
        filter: { _id: t._id },
        update: {
          order: t.order,
          status: t.status
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Task.bulkWrite(bulkOps);

      const io = req.app.get('io');

      io.to(`project:${req.body.projectId}`).emit(
        'task:reordered',
        tasks
      );
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;