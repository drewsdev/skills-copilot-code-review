document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  // Announcement elements
  const announcementPanel = document.getElementById("announcement-panel");
  const announcementList = document.getElementById("announcement-list");
  const announcementCount = document.getElementById("announcement-count");
  const manageAnnouncementsButton = document.getElementById(
    "manage-announcements-button"
  );
  const announcementModal = document.getElementById("announcement-modal");
  const closeAnnouncementModal = document.querySelector(
    ".close-announcement-modal"
  );
  const announcementForm = document.getElementById("announcement-form");
  const announcementFormTitle = document.getElementById("announcement-form-title");
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementTitleInput = document.getElementById("announcement-title");
  const announcementMessageInput = document.getElementById("announcement-message");
  const announcementStartDateInput = document.getElementById(
    "announcement-start-date"
  );
  const announcementExpirationDateInput = document.getElementById(
    "announcement-expiration-date"
  );
  const announcementCancelEditButton = document.getElementById(
    "announcement-cancel-edit"
  );
  const announcementAdminList = document.getElementById("announcement-admin-list");
  const announcementModalMessage = document.getElementById(
    "announcement-modal-message"
  );

  // Activity categories with corresponding colors
  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#f3e5f5", textColor: "#7b1fa2" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fff3e0", textColor: "#e65100" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  // State for activities and filters
  let allActivities = {};
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";

  // Announcement state
  let activeAnnouncements = [];
  let managedAnnouncements = [];
  let editingAnnouncementId = null;

  // Authentication state
  let currentUser = null;

  // Time range mappings for the dropdown
  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initialize filters from active elements
  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  // Function to set day filter
  function setDayFilter(day) {
    currentDay = day;

    dayFilters.forEach((btn) => {
      if (btn.dataset.day === day) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Function to set time range filter
  function setTimeRangeFilter(timeRange) {
    currentTimeRange = timeRange;

    timeFilters.forEach((btn) => {
      if (btn.dataset.time === timeRange) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Check if user is already logged in (from localStorage)
  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout();
      }
    }

    updateAuthBodyClass();
  }

  // Validate user session with the server
  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        logout();
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  // Update UI based on authentication state
  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      manageAnnouncementsButton.classList.remove("hidden");
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      manageAnnouncementsButton.classList.add("hidden");
      closeAnnouncementModalHandler();
    }

    updateAuthBodyClass();
    fetchActivities();
    fetchActiveAnnouncements();
  }

  // Update body class for CSS targeting
  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  // Login function
  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  // Logout function
  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  // Show message in login modal
  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  // Open login modal
  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  // Close login modal
  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  // Show loading skeletons
  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    for (let i = 0; i < 9; i++) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  // Format schedule for display - handles both old and new format
  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);

      return `${days}, ${startTime} - ${endTime}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    }

    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    return "academic";
  }

  // Function to fetch activities from API with optional day and time filters
  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];

      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];
        if (currentTimeRange !== "weekend" && range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      allActivities = activities;
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to display filtered activities
  function displayFilteredActivities() {
    activitiesList.innerHTML = "";

    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) =>
          timeRanges.weekend.days.includes(day)
        );

        if (!isWeekendActivity) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details], index) => {
      renderActivityCard(name, details, index);
    });
  }

  // Function to render a single activity card
  function renderActivityCard(name, details, index) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";
    activityCard.style.animationDelay = `${Math.min(index * 0.04, 0.3)}s`;

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${
                isFull ? "disabled" : ""
              }>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  // Open registration modal
  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  // Close registration modal
  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);

  window.addEventListener("click", (event) => {
    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }
  });

  // Create and show confirmation dialog
  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="cancel-button" class="cancel-btn">Cancel</button>
            <button id="confirm-button" class="confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      const cancelBtn = confirmDialog.querySelector("#cancel-button");
      const confirmBtn = confirmDialog.querySelector("#confirm-button");
      cancelBtn.style.backgroundColor = "#f1f1f1";
      cancelBtn.style.color = "#333";
      confirmBtn.style.backgroundColor = "#dc3545";
      confirmBtn.style.color = "white";
    }

    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 300);
      }
    });
  }

  // Handle unregistration with confirmation
  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(
              activity
            )}/unregister?email=${encodeURIComponent(
              email
            )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
            {
              method: "POST",
            }
          );

          const result = await response.json();

          if (response.ok) {
            showMessage(result.message, "success");
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  // Show message function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle signup form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Announcement helpers
  function formatDateTime(value) {
    if (!value) {
      return "Starts immediately";
    }

    const date = new Date(value);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function toDatetimeLocalValue(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - tzOffsetMs);
    return localDate.toISOString().slice(0, 16);
  }

  function toIsoFromInput(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    return date.toISOString();
  }

  function showAnnouncementModalMessage(text, type) {
    announcementModalMessage.textContent = text;
    announcementModalMessage.className = `message ${type}`;
    announcementModalMessage.classList.remove("hidden");

    setTimeout(() => {
      announcementModalMessage.classList.add("hidden");
    }, 4500);
  }

  function resetAnnouncementForm() {
    editingAnnouncementId = null;
    announcementIdInput.value = "";
    announcementFormTitle.textContent = "Add Announcement";
    announcementForm.reset();
    announcementCancelEditButton.classList.add("hidden");
  }

  function populateAnnouncementForm(announcement) {
    editingAnnouncementId = announcement.id;
    announcementIdInput.value = announcement.id;
    announcementFormTitle.textContent = "Edit Announcement";
    announcementTitleInput.value = announcement.title;
    announcementMessageInput.value = announcement.message;
    announcementStartDateInput.value = toDatetimeLocalValue(announcement.start_date);
    announcementExpirationDateInput.value = toDatetimeLocalValue(
      announcement.expiration_date
    );
    announcementCancelEditButton.classList.remove("hidden");
  }

  function renderActiveAnnouncements() {
    if (activeAnnouncements.length === 0) {
      announcementPanel.classList.add("hidden");
      announcementList.innerHTML = "";
      announcementCount.textContent = "";
      return;
    }

    announcementPanel.classList.remove("hidden");
    announcementCount.textContent = `${activeAnnouncements.length} active`;

    announcementList.innerHTML = activeAnnouncements
      .map(
        (item, index) => `
          <article class="announcement-item" style="animation-delay:${Math.min(
            index * 0.06,
            0.2
          )}s">
            <div class="announcement-item-head">
              <h4>${escapeHtml(item.title)}</h4>
              <span class="announcement-expiration">Ends ${formatDateTime(
                item.expiration_date
              )}</span>
            </div>
            <p>${escapeHtml(item.message)}</p>
            <div class="announcement-meta">
              <span>Start: ${formatDateTime(item.start_date)}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderManagedAnnouncements() {
    if (managedAnnouncements.length === 0) {
      announcementAdminList.innerHTML = `
        <div class="announcement-empty-state">
          <p>No announcements yet. Add one from the form.</p>
        </div>
      `;
      return;
    }

    announcementAdminList.innerHTML = managedAnnouncements
      .map((item) => {
        const now = new Date();
        const start = item.start_date ? new Date(item.start_date) : null;
        const end = new Date(item.expiration_date);
        let statusLabel = "Scheduled";
        let statusClass = "scheduled";

        if (end <= now) {
          statusLabel = "Expired";
          statusClass = "expired";
        } else if (!start || start <= now) {
          statusLabel = "Active";
          statusClass = "active";
        }

        return `
          <article class="announcement-admin-item">
            <div class="announcement-admin-top">
              <h5>${escapeHtml(item.title)}</h5>
              <span class="announcement-status ${statusClass}">${statusLabel}</span>
            </div>
            <p>${escapeHtml(item.message)}</p>
            <div class="announcement-admin-meta">
              <span>Start: ${formatDateTime(item.start_date)}</span>
              <span>Expires: ${formatDateTime(item.expiration_date)}</span>
            </div>
            <div class="announcement-admin-actions">
              <button class="secondary-button announcement-edit" data-id="${item.id}">Edit</button>
              <button class="danger-button announcement-delete" data-id="${item.id}">Delete</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function fetchActiveAnnouncements() {
    try {
      const response = await fetch("/announcements");
      if (!response.ok) {
        throw new Error("Failed to load announcements");
      }

      activeAnnouncements = await response.json();
      renderActiveAnnouncements();
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      announcementPanel.classList.add("hidden");
    }
  }

  async function fetchManagedAnnouncements() {
    if (!currentUser) {
      managedAnnouncements = [];
      renderManagedAnnouncements();
      return;
    }

    try {
      const response = await fetch(
        `/announcements/manage?teacher_username=${encodeURIComponent(
          currentUser.username
        )}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to load announcements");
      }

      managedAnnouncements = await response.json();
      renderManagedAnnouncements();
    } catch (error) {
      console.error("Error fetching managed announcements:", error);
      announcementAdminList.innerHTML = `
        <div class="announcement-empty-state">
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  function openAnnouncementModal() {
    if (!currentUser) {
      showMessage("You must be signed in to manage announcements.", "error");
      return;
    }

    announcementModal.classList.remove("hidden");
    setTimeout(() => {
      announcementModal.classList.add("show");
    }, 10);

    resetAnnouncementForm();
    announcementModalMessage.classList.add("hidden");
    fetchManagedAnnouncements();
  }

  function closeAnnouncementModalHandler() {
    announcementModal.classList.remove("show");
    setTimeout(() => {
      announcementModal.classList.add("hidden");
      resetAnnouncementForm();
    }, 300);
  }

  manageAnnouncementsButton.addEventListener("click", openAnnouncementModal);
  closeAnnouncementModal.addEventListener("click", closeAnnouncementModalHandler);

  window.addEventListener("click", (event) => {
    if (event.target === announcementModal) {
      closeAnnouncementModalHandler();
    }
  });

  announcementCancelEditButton.addEventListener("click", () => {
    resetAnnouncementForm();
  });

  announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementModalMessage("You must be signed in.", "error");
      return;
    }

    const title = announcementTitleInput.value.trim();
    const message = announcementMessageInput.value.trim();
    const startDateInput = announcementStartDateInput.value;
    const expirationDateInput = announcementExpirationDateInput.value;

    if (!expirationDateInput) {
      showAnnouncementModalMessage("Expiration date is required.", "error");
      return;
    }

    const expirationIso = toIsoFromInput(expirationDateInput);
    const startIso = toIsoFromInput(startDateInput);

    if (startIso && new Date(startIso) >= new Date(expirationIso)) {
      showAnnouncementModalMessage(
        "Start date must be earlier than expiration date.",
        "error"
      );
      return;
    }

    const params = new URLSearchParams({
      title,
      message,
      expiration_date: expirationIso,
      teacher_username: currentUser.username,
    });

    if (startIso) {
      params.set("start_date", startIso);
    }

    const endpoint = editingAnnouncementId
      ? `/announcements/${encodeURIComponent(editingAnnouncementId)}?${params.toString()}`
      : `/announcements?${params.toString()}`;

    const method = editingAnnouncementId ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, { method });
      const data = await response.json();

      if (!response.ok) {
        showAnnouncementModalMessage(data.detail || "Failed to save announcement.", "error");
        return;
      }

      showAnnouncementModalMessage(
        editingAnnouncementId ? "Announcement updated." : "Announcement created.",
        "success"
      );
      resetAnnouncementForm();
      fetchManagedAnnouncements();
      fetchActiveAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      showAnnouncementModalMessage("Failed to save announcement.", "error");
    }
  });

  announcementAdminList.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.classList.contains("announcement-edit")) {
      const announcement = managedAnnouncements.find(
        (item) => item.id === target.dataset.id
      );
      if (announcement) {
        populateAnnouncementForm(announcement);
      }
      return;
    }

    if (target.classList.contains("announcement-delete")) {
      const announcementId = target.dataset.id;
      const announcement = managedAnnouncements.find((item) => item.id === announcementId);

      if (!announcement) {
        return;
      }

      showConfirmationDialog(
        `Delete "${announcement.title}"? This cannot be undone.`,
        async () => {
          try {
            const response = await fetch(
              `/announcements/${encodeURIComponent(
                announcementId
              )}?teacher_username=${encodeURIComponent(currentUser.username)}`,
              { method: "DELETE" }
            );

            const data = await response.json();
            if (!response.ok) {
              showAnnouncementModalMessage(data.detail || "Failed to delete.", "error");
              return;
            }

            showAnnouncementModalMessage("Announcement deleted.", "success");
            fetchManagedAnnouncements();
            fetchActiveAnnouncements();
          } catch (error) {
            console.error("Error deleting announcement:", error);
            showAnnouncementModalMessage("Failed to delete announcement.", "error");
          }
        }
      );
    }
  });

  window.activityFilters = {
    setDayFilter,
    setTimeRangeFilter,
  };

  checkAuthentication();
  initializeFilters();
  fetchActivities();
  fetchActiveAnnouncements();
});