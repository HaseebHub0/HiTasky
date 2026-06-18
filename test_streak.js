function calculateStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.isCompleted && t.completedAt)
      .map((t) => {
        const d = new Date(t.completedAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  console.log("Completed Dates Set:", Array.from(completedDates));

  let streak = 0;
  let checkDate = new Date();
  const formatDate = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  console.log("Check date today:", formatDate(checkDate));

  // If today has completion, count starting today
  if (completedDates.has(formatDate(checkDate))) {
    while (completedDates.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Check if yesterday was completed
    checkDate.setDate(checkDate.getDate() - 1);
    console.log("Check date yesterday:", formatDate(checkDate));
    if (completedDates.has(formatDate(checkDate))) {
      while (completedDates.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  }
  return streak;
}

// Today
const todayIso = new Date().toISOString();
// Yesterday
const yesterdayIso = new Date(Date.now() - 86400000).toISOString();

console.log("Test 1: completed today and yesterday");
console.log("Result streak:", calculateStreak([
  { id: '1', isCompleted: true, completedAt: todayIso },
  { id: '2', isCompleted: true, completedAt: yesterdayIso }
]));

console.log("\nTest 2: completed yesterday only");
console.log("Result streak:", calculateStreak([
  { id: '2', isCompleted: true, completedAt: yesterdayIso }
]));

console.log("\nTest 3: completed today only");
console.log("Result streak:", calculateStreak([
  { id: '1', isCompleted: true, completedAt: todayIso }
]));

console.log("\nTest 4: completed neither");
console.log("Result streak:", calculateStreak([]));
