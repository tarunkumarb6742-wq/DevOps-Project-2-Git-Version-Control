// This script updates the time display and keeps the page dynamic.
document.addEventListener("DOMContentLoaded", () => {
  const dateTimeElement = document.getElementById("datetime");

  if (dateTimeElement) {
    const updateTime = () => {
      const now = new Date();
      dateTimeElement.textContent = now.toLocaleString();
    };

    updateTime();
    setInterval(updateTime, 1000);
  }
});
