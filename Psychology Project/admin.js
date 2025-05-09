// FIREBASE INTEGRATION FOR DOCTOR ADMIN PANEL

// Firebase is initialized and auth state is checked in admin.html script block.
// This file contains functions called based on the authentication state.

document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase instances are available (they should be from the admin.html script)
    // If running admin.js standalone, you might need to re-initialize or ensure global access
    const db = firebase.firestore();
    const auth = firebase.auth();


    // Doctor Login Form (Keeping this listener here to handle the submit action)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value; // Passwords often have strict trimming rules handled by Auth

        // Clear previous error messages
        const loginErrorEl = document.getElementById('login-error');
        if(loginErrorEl) loginErrorEl.textContent = '';


        auth.signInWithEmailAndPassword(email, password)
          .then((userCredential) => {
            // Successfully logged in.
            // The onAuthStateChanged listener in admin.html will detect this
            // and handle showing the admin content and calling the load functions.
            console.log("User logged in:", userCredential.user.uid);
            // No explicit redirect needed here.

          })
          .catch((error) => {
            // Handle errors (e.g., wrong password, user not found)
            console.error("Login Error:", error);
            if(loginErrorEl) {
                // Display a user-friendly error message
                switch (error.code) {
                    case 'auth/user-not-found':
                        loginErrorEl.textContent = 'No user found with this email.';
                        break;
                    case 'auth/wrong-password':
                        loginErrorEl.textContent = 'Incorrect password.';
                        break;
                    case 'auth/invalid-email':
                        loginErrorEl.textContent = 'Invalid email address format.';
                        break;
                    case 'auth/network-request-failed':
                        loginErrorEl.textContent = 'Network error. Please check your connection.';
                        break;
                    default:
                        loginErrorEl.textContent = 'Login failed. Please try again.';
                }
            }
             // Optional: Show a global notification as well
             if (typeof showNotification === 'function') {
                 showNotification(`Login failed: ${error.message}`, 'error');
             }
          });
      });
    }


    // Load doctor information (Called by admin.html script if logged in)
    // This function is attached to the window in admin.html script for access
    window.loadDoctorInfo = function(doctorId) {
      // Ensure db instance is available
       if (!db) {
           console.error("Firestore DB not initialized in admin.js loadDoctorInfo.");
           return;
       }
      db.collection('doctors').doc(doctorId).get()
        .then((doc) => {
          const doctorNameEl = document.getElementById('doctor-name');
          const doctorSpecialtyEl = document.getElementById('doctor-specialty');
          const doctorPhotoEl = document.getElementById('doctor-photo');

          if (doc.exists) {
            const doctorData = doc.data();

            if (doctorNameEl) doctorNameEl.textContent = doctorData.name || 'Dr. Name';
            if (doctorSpecialtyEl) doctorSpecialtyEl.textContent = doctorData.specialty || 'Specialization';
            // Load doctor image if available
            // TODO: Ensure photoURL is set in your Firestore documents for doctors
            if (doctorPhotoEl) {
                doctorPhotoEl.src = doctorData.photoURL || 'path/to/default/doctor-image.jpg'; // Use a default image if photoURL is missing
            }
          } else {
              console.warn("No doctor profile found in 'doctors' collection for UID:", doctorId);
              // Optionally update UI to show no doctor info
               if(doctorNameEl) doctorNameEl.textContent = 'Profile Not Found';
               if(doctorSpecialtyEl) doctorSpecialtyEl.textContent = '';
               if(doctorPhotoEl) doctorPhotoEl.src = 'path/to/default/doctor-image.jpg'; // Or a different placeholder
          }
        })
        .catch((error) => {
          console.error("Error loading doctor info:", error);
           if(document.getElementById('doctor-name')) document.getElementById('doctor-name').textContent = 'Error loading profile';
           if(document.getElementById('doctor-specialty')) document.getElementById('doctor-specialty').textContent = '';
           // Optional notification: showNotification('Error loading doctor profile.', 'error');
        });
    };

    // Load weekly statistics dashboard (Called by admin.html script if logged in)
    // This function is attached to the window in admin.html script for access
    window.loadWeeklyStats = function(doctorId) {
         if (!db) {
             console.error("Firestore DB not initialized in admin.js loadWeeklyStats.");
             return;
         }
          if (!doctorId) {
              console.warn("Doctor ID not available for loading weekly stats.");
              return;
          }

        const now = new Date();
        // Calculate the start of the current week (adjust day 0-6 for your desired start)
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Calculate the end of the current week (beginning of the next week)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);


        db.collection('appointments')
            .where('doctorId', '==', doctorId)
            .where('dateTime', '>=', firebase.firestore.Timestamp.fromDate(weekStart))
            .where('dateTime', '<', firebase.firestore.Timestamp.fromDate(weekEnd)) // Use '<' to include appointments up to the last millisecond of the week
            .get()
            .then((querySnapshot) => {
                // Count appointments by status
                let confirmedCount = 0;
                let pendingCount = 0;
                let completedCount = 0;
                let cancelledCount = 0;

                querySnapshot.forEach((doc) => {
                    const status = doc.data().status;
                    switch(status) {
                        case 'confirmed': confirmedCount++; break;
                        case 'pending': pendingCount++; break;
                        case 'completed': completedCount++; break;
                        case 'cancelled': cancelledCount++; break;
                        default: console.warn("Unknown appointment status:", status, "for doc:", doc.id); // Log unexpected statuses
                    }
                });

                // Update stats on the page
                const totalEl = document.getElementById('total-appointments');
                const confirmedEl = document.getElementById('confirmed-appointments');
                const pendingEl = document.getElementById('pending-appointments');
                const completedEl = document.getElementById('completed-appointments');
                const cancelledEl = document.getElementById('cancelled-appointments');

                if(totalEl) totalEl.textContent = querySnapshot.size;
                if(confirmedEl) confirmedEl.textContent = confirmedCount;
                if(pendingEl) pendingEl.textContent = pendingCount;
                if(completedEl) completedEl.textContent = completedCount;
                if(cancelledEl) cancelledEl.textContent = cancelledCount;

            })
            .catch((error) => {
                console.error("Error loading weekly stats:", error);
                 // Update UI elements to show error or N/A
                 const statsElements = ['total-appointments', 'confirmed-appointments', 'pending-appointments', 'completed-appointments', 'cancelled-appointments'];
                 statsElements.forEach(id => {
                     const el = document.getElementById(id);
                     if(el) el.textContent = 'Error'; // Or 'N/A'
                 });
                 // Optional notification: showNotification('Error loading weekly stats.', 'error');
            });
    }


    // Initialize FullCalendar (Called by admin.html script if logged in)
    // This function is attached to the window in admin.html script for access
    window.initializeCalendar = function(doctorId) {
      const calendarEl = document.getElementById('calendar');
      if (!calendarEl) {
          console.error("Calendar element #calendar not found.");
          return;
      }
       if (!db) {
           console.error("Firestore DB not initialized in admin.js initializeCalendar.");
           // Display a message in the calendar area
           calendarEl.innerHTML = '<p>Error: Database not initialized.</p>';
           return;
       }
        if (!doctorId) {
            console.warn("Doctor ID not available for initializing calendar.");
             calendarEl.innerHTML = '<p>Error: Doctor ID not found.</p>';
            return;
        }


      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        height: 'auto',
        slotMinTime: '08:00:00', // Example start time
        slotMaxTime: '20:00:00', // Example end time
        allDaySlot: false,
        slotDuration: '00:30:00', // Appointments in 30-minute slots
        selectable: true, // Allow selecting time slots to create new appointments
        selectMirror: true,
        navLinks: true,
        businessHours: { // Define doctor's standard working hours
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday (adjust as needed)
          startTime: '09:00', // Example start time
          endTime: '18:00', // Example end time
        },
        eventTimeFormat: {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        },
        // Allow events to be moved or resized (optional - requires updating Firestore)
         editable: true,

        // Event handling
        eventClick: function(info) {
          // Open the appointment details modal when an event is clicked
          openAppointmentModal(info.event);
        },
        select: function(info) {
             // When a time slot is selected (if selectable is true)
             // Open the new appointment modal and pre-fill date/time
          openNewAppointmentModal(info);
        },
         // Event Drop/Resize (Optional: Implement if you want doctors to reschedule by dragging)
         eventDrop: function(info) { handleEventDropResize(info); },
         eventResize: function(info) { handleEventDropResize(info); },


        // Load events from Firebase
        events: function(info, successCallback, failureCallback) {
          // Fetch appointments for the current doctor
          db.collection('appointments')
            .where('doctorId', '==', doctorId)
             // Optional: Filter events within the calendar's visible date range for performance
             // .where('dateTime', '>=', firebase.firestore.Timestamp.fromDate(info.start))
             // .where('dateTime', '<', firebase.firestore.Timestamp.fromDate(info.end))
            .get()
            .then((querySnapshot) => {
              const events = [];
              querySnapshot.forEach((doc) => {
                const appt = doc.data();
                // Ensure appt.dateTime is a valid Firestore Timestamp and can be converted to Date
                if (appt.dateTime && typeof appt.dateTime.toDate === 'function') {
                     const startTime = appt.dateTime.toDate();
                     // Ensure the date conversion was successful
                     if (isNaN(startTime.getTime())) {
                         console.warn("Skipping appointment with invalid start date:", doc.id, appt);
                         return; // Skip this document if date is invalid
                     }

                     // Assume a 1-hour appointment duration if end time is missing or invalid
                     const endTime = (appt.endTime && typeof appt.endTime.toDate === 'function' && !isNaN(appt.endTime.toDate().getTime()))
                                     ? appt.endTime.toDate()
                                     : new Date(startTime.getTime() + (60 * 60 * 1000));

                    events.push({
                      id: doc.id,
                      title: appt.name || 'Appointment', // Use patient name as title
                      start: startTime,
                      end: endTime,
                      extendedProps: { // Store additional appointment data
                        email: appt.email,
                        phone: appt.phone,
                        message: appt.message,
                        status: appt.status,
                        doctorName: appt.doctorName // Include doctor name if stored
                      },
                      color: getStatusColor(appt.status) // Set event color based on status
                    });
                } else {
                    console.warn("Appointment document missing or has invalid 'dateTime':", doc.id, appt);
                }
              });
              successCallback(events); // Pass the fetched events to FullCalendar
            })
            .catch((error) => {
              console.error("Error loading events:", error);
              failureCallback(error); // Inform FullCalendar of the error
               if (typeof showNotification === 'function') {
                   showNotification('Error loading appointments.', 'error'); // Show user notification
               }
            });
        }
      });

      calendar.render();

      // Make calendar object globally accessible if needed for adding events
      window.doctorCalendar = calendar;
    }

     // Optional: Handle event drop or resize (requires updating Firestore)
     function handleEventDropResize(info) {
         // Ensure db and auth instances are available
         if (!db || !auth) {
             console.error("Firestore DB or Auth not initialized for handleEventDropResize.");
             info.revert(); // Revert the calendar change
             return;
         }

         const event = info.event;
         const appointmentId = event.id;
         const newStartTime = firebase.firestore.Timestamp.fromDate(event.start);
         // FullCalendar provides the end time on resize, may be null on drop
         const newEndTime = event.end ? firebase.firestore.Timestamp.fromDate(event.end) : null;

         // Check if the user is the doctor assigned to this appointment (basic check)
         const currentUser = auth.currentUser;
         if (!currentUser || event.extendedProps.doctorId !== currentUser.uid) {
             console.warn("Attempted to move/resize appointment not assigned to this doctor.");
             if (typeof showNotification === 'function') {
                  showNotification('You can only move/resize your own appointments.', 'warning');
             }
             info.revert(); // Revert the calendar change
             return;
         }


         if (confirm(`Are you sure you want to move/resize this appointment to ${event.start.toLocaleString()}?`)) {
              db.collection('appointments').doc(appointmentId).update({
                  dateTime: newStartTime,
                  // Only update endTime if it's a valid date or null
                  endTime: newEndTime instanceof firebase.firestore.Timestamp ? newEndTime : (event.end === null ? null : event.end),
                  // Optional: Could set status back to 'pending' or a 'rescheduled' status
                  // status: 'pending'
              })
              .then(() => {
                  if (typeof showNotification === 'function') {
                       showNotification('Appointment time updated.', 'success');
                   }
                  // Calendar will likely re-fetch or update automatically
                  // Refresh stats if timing affects current week
                  if (currentUser) loadWeeklyStats(currentUser.uid);
              })
              .catch((error) => {
                  console.error("Error updating appointment time:", error);
                  if (typeof showNotification === 'function') {
                       showNotification('Error updating appointment time.', 'error');
                   }
                  info.revert(); // Revert the calendar change on error
              });
         } else {
             info.revert(); // Revert if user cancels
         }
     }


    // Color-code appointments based on status
    function getStatusColor(status) {
      switch(status) {
        case 'confirmed': return '#4caf50'; // Green
        case 'pending': return '#ff9800';   // Orange
        case 'cancelled': return '#f44336'; // Red
        case 'completed': return '#9e9e9e'; // Gray
        default: return '#2196f3';          // Blue (or a default color)
      }
    }

    // Open appointment details modal (Called by eventClick in calendar)
     // This function is attached to the window in admin.html script for access
    window.openAppointmentModal = function(event) {
      const modal = document.getElementById('appointment-modal');
      if (!modal) {
          console.error("Appointment details modal #appointment-modal not found.");
          return;
      }
       // Ensure db and auth instances are available
       if (!db || !auth) {
           console.error("Firestore DB or Auth not initialized for openAppointmentModal.");
           // Optionally show error in modal
           return;
       }

      const appointmentId = event.id;

      // Populate modal with event details
      const patientNameEl = document.getElementById('modal-patient-name');
      const appointmentTimeEl = document.getElementById('modal-appointment-time');
      const patientEmailEl = document.getElementById('modal-patient-email');
      const patientPhoneEl = document.getElementById('modal-patient-phone');
      const patientMessageEl = document.getElementById('modal-patient-message');
      const statusSelect = document.getElementById('modal-status-select');


      if(patientNameEl) patientNameEl.textContent = event.title || 'N/A';
      if(appointmentTimeEl) {
          appointmentTimeEl.textContent =
            event.start ? event.start.toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'N/A';
      }
      if(patientEmailEl) patientEmailEl.textContent = event.extendedProps.email || 'N/A';
      if(patientPhoneEl) patientPhoneEl.textContent = event.extendedProps.phone || 'N/A';
      if(patientMessageEl) patientMessageEl.textContent = event.extendedProps.message || 'N/A';
      if(statusSelect) statusSelect.value = event.extendedProps.status || 'pending';


      // Set up update button
      const updateBtn = document.getElementById('update-status-btn');
      if(updateBtn && statusSelect) {
           // Remove previous click listener to prevent multiple bindings
           const oldUpdateBtn = updateBtn.cloneNode(true);
           updateBtn.parentNode.replaceChild(oldUpdateBtn, updateBtn);
           const newUpdateBtn = oldUpdateBtn; // Use the new button


           newUpdateBtn.onclick = function() {
                const newStatus = statusSelect.value;
                 // Ensure appointmentId is valid
                 if (!appointmentId) {
                     console.error("Appointment ID is missing for update.");
                      if (typeof showNotification === 'function') showNotification('Error: Appointment ID not found.', 'error');
                     return;
                 }

                db.collection('appointments').doc(appointmentId).update({
                  status: newStatus
                })
                .then(() => {
                  // Update calendar event color and extended prop
                  event.setProp('backgroundColor', getStatusColor(newStatus));
                  event.setExtendedProp('status', newStatus);

                  // Close modal
                  closeModal();

                  // Notify user (showNotification is expected to be globally available or defined here)
                   if (typeof showNotification === 'function') {
                       showNotification('Appointment status updated successfully!', 'success');
                   } else {
                       console.warn("showNotification function not found in scope.");
                   }


                  // Refresh weekly stats after update
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                       loadWeeklyStats(currentUser.uid);
                  } else {
                       console.warn("No current user found when trying to refresh weekly stats after update.");
                  }

                })
                .catch((error) => {
                  console.error("Error updating appointment:", error);
                   if (typeof showNotification === 'function') {
                       showNotification('Error updating appointment.', 'error');
                   }
                });
           };
      } else {
           console.warn("Update button or status select not found in modal.");
      }


      // Set up delete button
      const deleteBtn = document.getElementById('delete-appointment-btn');
      if(deleteBtn) {
           // Remove previous click listener
           const oldDeleteBtn = deleteBtn.cloneNode(true);
           deleteBtn.parentNode.replaceChild(oldDeleteBtn, deleteBtn);
           const newDeleteBtn = oldDeleteBtn; // Use the new button

          newDeleteBtn.onclick = function() {
               // Ensure appointmentId is valid
                 if (!appointmentId) {
                     console.error("Appointment ID is missing for delete.");
                      if (typeof showNotification === 'function') showNotification('Error: Appointment ID not found.', 'error');
                     return;
                 }
            if (confirm('Are you sure you want to delete this appointment?')) {
              db.collection('appointments').doc(appointmentId).delete()
                .then(() => {
                  // Remove event from calendar
                  if (window.doctorCalendar) { // Ensure calendar object exists
                     event.remove();
                  } else {
                      console.warn("doctorCalendar object not found, cannot remove event visually.");
                  }


                  // Close modal
                  closeModal();

                  // Notify user
                   if (typeof showNotification === 'function') {
                      showNotification('Appointment deleted successfully!', 'success');
                   }


                  // Refresh weekly stats after deletion
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                       loadWeeklyStats(currentUser.uid);
                  } else {
                       console.warn("No current user found when trying to refresh weekly stats after deletion.");
                  }
                })
                .catch((error) => {
                  console.error("Error deleting appointment:", error);
                  if (typeof showNotification === 'function') {
                       showNotification('Error deleting appointment.', 'error');
                   }
                });
            }
          };
      } else {
           console.warn("Delete button not found in modal.");
      }


      // Show modal
      modal.style.display = 'block';
    }

    // Open new appointment modal (Called by calendar select or add button)
     // This function is attached to the window in admin.html script for access
    window.openNewAppointmentModal = function(info = {}) { // Default info to empty object
      const modal = document.getElementById('new-appointment-modal');
       if (!modal) {
            console.error("New appointment modal #new-appointment-modal not found.");
           return;
       }
        // Ensure db and auth instances are available
       if (!db || !auth) {
           console.error("Firestore DB or Auth not initialized for openNewAppointmentModal.");
           // Optionally show error in modal
           return;
       }


        const newAppointmentDateInput = document.getElementById('new-appointment-date');
        const newAppointmentTimeInput = document.getElementById('new-appointment-time');
        const newAppointmentForm = document.getElementById('new-appointment-form');


      // Set selected date/time in the form (if info object has startStr from calendar click)
      if(newAppointmentDateInput && info && info.startStr) {
         newAppointmentDateInput.value = info.startStr.slice(0, 10); //YYYY-MM-DD
      } else if (newAppointmentDateInput) {
          newAppointmentDateInput.value = ''; // Clear if no date info
      }

       if(newAppointmentTimeInput && info && info.startStr) {
           newAppointmentTimeInput.value = info.startStr.slice(11, 16); // HH:MM
       } else if (newAppointmentTimeInput) {
           newAppointmentTimeInput.value = ''; // Clear if no time info
       }

       // Add event listener to the form's submit button instead of the modal's create button
       // This allows hitting Enter to submit the form inside the modal

        // We will add a submit listener below the function definition and remove old ones


      // Show modal
      modal.style.display = 'block';

       // Optional: Focus on the first input field
       const firstInput = document.getElementById('new-patient-name');
       if(firstInput) firstInput.focus();
    }

     // Add submit listener to the new appointment form
     const newAppointmentForm = document.getElementById('new-appointment-form');
      if(newAppointmentForm) {
           // Remove any previously attached submit listeners to prevent duplicates
           // A simple way is to clone and replace, but be careful with other listeners
           // Alternatively, manage listeners with removeEventListener

           // For simplicity here, we'll add a single listener that checks if the modal is open
           newAppointmentForm.addEventListener('submit', function(e) {
                e.preventDefault(); // Prevent default form submission

                 const modal = document.getElementById('new-appointment-modal');
                 if (!modal || modal.style.display !== 'block') {
                      // If the modal is not open, this submit shouldn't happen
                      return;
                 }


                const patientName = document.getElementById('new-patient-name').value.trim();
                const patientEmail = document.getElementById('new-patient-email').value.trim();
                const patientPhone = document.getElementById('new-patient-phone').value.trim();
                const patientMessage = document.getElementById('new-patient-message').value.trim();
                const appointmentDateInput = document.getElementById('new-appointment-date');
                const appointmentTimeInput = document.getElementById('new-appointment-time');
                const appointmentDate = appointmentDateInput ? appointmentDateInput.value : '';
                const appointmentTime = appointmentTimeInput ? appointmentTimeInput.value : '';


                if (!patientName || !patientEmail || !patientPhone || !appointmentDate || !appointmentTime) {
                  if (typeof showNotification === 'function') {
                       showNotification('Please fill in all required fields.', 'error');
                   }
                  return;
                }

                // Create appointment timestamp
                const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
                 if (isNaN(appointmentDateTime.getTime())) {
                      if (typeof showNotification === 'function') {
                           showNotification('Invalid date or time selected.', 'error');
                       }
                       return;
                 }


                // Get current user (doctor)
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    if (typeof showNotification === 'function') {
                        showNotification('Doctor not logged in.', 'error');
                    }
                     console.error("Attempted to create appointment without logged-in doctor.");
                     return;
                }

                 // Show processing state on the submit button if needed (modal form doesn't have one directly)
                 // You might add a dedicated "Create" button within the modal form and use its state.
                 // const createButtonInModal = modal.querySelector('#create-appointment-btn');
                 // if(createButtonInModal) { createButtonInModal.textContent = 'Creating...'; createButtonInModal.disabled = true; }


                // Add appointment to Firestore
                db.collection('appointments').add({
                  name: patientName,
                  email: patientEmail,
                  phone: patientPhone,
                  message: patientMessage,
                  dateTime: firebase.firestore.Timestamp.fromDate(appointmentDateTime),
                  doctorId: currentUser.uid, // Assign to the current doctor
                  status: 'confirmed', // Doctor-created appointments are often confirmed by default
                  dateCreated: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then((docRef) => {
                  // Add event to calendar (FullCalendar)
                  if (window.doctorCalendar) {
                      window.doctorCalendar.addEvent({
                        id: docRef.id,
                        title: patientName,
                        start: appointmentDateTime,
                        end: new Date(appointmentDateTime.getTime() + (60 * 60 * 1000)), // Assume 1 hour
                        extendedProps: { // Store additional data
                          email: patientEmail,
                          phone: patientPhone,
                          message: patientMessage,
                          status: 'confirmed',
                           doctorId: currentUser.uid // Add doctorId to extendedProps for eventDrop/Resize logic
                        },
                        color: getStatusColor('confirmed')
                      });
                  } else {
                       console.warn("doctorCalendar object not found, cannot add event visually.");
                  }


                  // Close modal and reset form
                  newAppointmentForm.reset();
                  closeNewAppointmentModal(); // This also hides the modal

                  // Notify user
                   if (typeof showNotification === 'function') {
                       showNotification('Appointment created successfully!', 'success');
                   }

                   // Refresh weekly stats after adding appointment
                   loadWeeklyStats(currentUser.uid);

                })
                .catch((error) => {
                  console.error("Error adding appointment:", error);
                   if (typeof showNotification === 'function') {
                       showNotification('Error creating appointment.', 'error');
                   }
                });

                 // Reset button state if you added one
                 // if(createButtonInModal) { createButtonInModal.textContent = 'Create Appointment'; createButtonInModal.disabled = false; }
           });
      }


    // Close modal functions
    window.closeModal = function() {
      const modal = document.getElementById('appointment-modal');
      if(modal) modal.style.display = 'none';
    };

    window.closeNewAppointmentModal = function() {
       const modal = document.getElementById('new-appointment-modal');
       if(modal) modal.style.display = 'none';
       // Reset the form when closing
       const form = document.getElementById('new-appointment-form');
       if(form) form.reset();
        // Clear error message if any
         const loginErrorEl = document.getElementById('login-error');
         if(loginErrorEl) loginErrorEl.textContent = ''; // Clear login errors if modal is also related
    };

    // Add event listener to the "Add New Appointment" button in the admin panel header
    const addAppointmentBtn = document.getElementById('add-appointment-btn');
     if(addAppointmentBtn) {
         addAppointmentBtn.addEventListener('click', function() {
             // Open the new appointment modal without pre-selecting a time
             openNewAppointmentModal({}); // Pass an empty object to clear date/time
         });
     }


  }); // End DOMContentLoaded