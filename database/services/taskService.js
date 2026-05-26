const { getDB } = require('../firebase');
const { addCoins } = require('./balanceService');

const db = () => getDB();

// Static task list (can be made dynamic via admin later)
const DEFAULT_TASKS = [
  { id: 'task_join_channel', title: 'Join our Channel', reward: 30, description: 'Join @yourchannel and stay for 24h' },
  { id: 'task_follow_twitter', title: 'Follow on Twitter', reward: 40, description: 'Follow and retweet pinned post' },
  { id: 'task_watch_5ads', title: 'Watch 5 Ads', reward: 25, description: 'Watch 5 ads in a row' },
];

async function getTasks() {
  // For now return static, can load from /tasks in db later
  return DEFAULT_TASKS;
}

async function claimTask(userId, taskId) {
  const tasks = await getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return { success: false, message: 'Task not found' };

  // Check if already claimed
  const userTaskSnap = await db().ref(`userTasks/${userId}/${taskId}`).once('value');
  if (userTaskSnap.val()) {
    return { success: false, message: 'Already claimed' };
  }

  await addCoins(userId, task.reward);
  await db().ref(`userTasks/${userId}/${taskId}`).set({
    claimedAt: Date.now(),
    reward: task.reward,
  });

  return { success: true, reward: task.reward };
}

async function getCompletedTasks(userId) {
  const snap = await db().ref(`userTasks/${userId}`).once('value');
  return snap.val() || {};
}

module.exports = {
  getTasks,
  claimTask,
  getCompletedTasks,
  DEFAULT_TASKS,
};
