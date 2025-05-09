         // Mobile Menu Toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuBtn.innerHTML = navMenu.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
        
        // Smooth Scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                // Close mobile menu if open
                if (navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                }
                
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Testimonial Slider
        const testimonialWrapper = document.getElementById('testimonial-wrapper');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        let slideIndex = 0;
        const totalSlides = document.querySelectorAll('.testimonial').length;
        
        function showSlide(index) {
            if (index < 0) {
                slideIndex = totalSlides - 1;
            } else if (index >= totalSlides) {
                slideIndex = 0;
            }
            
            testimonialWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
        }
        
        prevBtn.addEventListener('click', () => {
            slideIndex--;
            showSlide(slideIndex);
        });
        
        nextBtn.addEventListener('click', () => {
            slideIndex++;
            showSlide(slideIndex);
        });
        
        // Auto slide
        setInterval(() => {
            slideIndex++;
            showSlide(slideIndex);
        }, 5000);
        
        // Header Scroll Effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
                header.style.padding = '10px 0';
            } else {
                header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                header.style.padding = '15px 0';
            }
        });
 
        // Firebase Configuration and Appointment Booking System
// Include this in your HTML before the closing </body> tag

// 1. Add Firebase SDK to your HTML
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

// 2. Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvJiabxBAOxibrdrl8E7Hw2sV8Ab4nCS0",
  authDomain: "psychology-2b150.firebaseapp.com",
  projectId: "psychology-2b150",
  storageBucket: "psychology-2b150.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "1:1025399301938:web:b041717ed60e898153992b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 3. Form submission handler for appointment booking
document.addEventListener('DOMContentLoaded', function() {
  const appointmentForm = document.querySelector('#appointment form');
  
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Show loading state
      const submitButton = appointmentForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Processing...';
      submitButton.disabled = true;
      
      // Get form data
      const formData = {
        name: appointmentForm.querySelector('#name').value,
        email: appointmentForm.querySelector('#email').value,
        phone: appointmentForm.querySelector('#phone').value,
        // Change 'doctor' to 'doctorId' and get the value from the dropdown
        doctorId: appointmentForm.querySelector('#doctor').value || null, // Use null if no doctor is selected
        // Optionally save the doctor's name as well for easier display later
        doctorName: appointmentForm.querySelector('#doctor').options[appointmentForm.querySelector('#doctor').selectedIndex].text || 'No preference',
        message: appointmentForm.querySelector('#message').value,
        status: 'pending', // Default status
        dateRequested: firebase.firestore.Timestamp.now()
      };
      
      // Add appointment to Firestore
      db.collection('appointments')
        .add(formData)
        .then((docRef) => {
          // Success
          showNotification('Appointment request submitted successfully! We will contact you shortly.', 'success');
          appointmentForm.reset();
          
          // Optional: Send email notification via Firebase Functions (requires separate setup)
          // sendEmailNotification(formData, docRef.id);
        })
        .catch((error) => {
          // Error
          console.error("Error adding appointment: ", error);
          showNotification('There was an error submitting your appointment. Please try again or contact us directly.', 'error');
        })
        .finally(() => {
          // Reset button state
          submitButton.textContent = originalButtonText;
          submitButton.disabled = false;
        });
    });
  }
});

// 4. Helper function to show notification
function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style notification
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '1000';
  notification.style.maxWidth = '90%';
  
  if (type === 'success') {
    notification.style.backgroundColor = '#4caf50';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f44336';
    notification.style.color = 'white';
  }
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 5000);
}

// 5. Admin functionality - optional addition to create a simple admin interface
// This function would be used in an admin page to view appointments
function loadAppointmentsForAdmin() {
  // Check if admin is logged in (requires Firebase Auth setup)
  // For demo purposes, we'll skip the authentication check
  
  const appointmentsContainer = document.getElementById('appointments-list');
  if (!appointmentsContainer) return;
  
  appointmentsContainer.innerHTML = '<p>Loading appointments...</p>';
  
  db.collection('appointments')
    .orderBy('dateRequested', 'desc')
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        appointmentsContainer.innerHTML = '<p>No appointments found.</p>';
        return;
      }
      
      let html = '<div class="appointments-grid">';
      querySnapshot.forEach((doc) => {
        const appointment = doc.data();
        const date = appointment.dateRequested.toDate();
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        html += `
          <div class="appointment-card" data-id="${doc.id}">
            <h3>${appointment.name}</h3>
            <p><strong>Date Requested:</strong> ${formattedDate}</p>
            <p><strong>Contact:</strong> ${appointment.phone} | ${appointment.email}</p>
            <p><strong>Doctor:</strong> ${appointment.doctor}</p>
            <p><strong>Message:</strong> ${appointment.message}</p>
            <p><strong>Status:</strong> 
              <select class="status-selector">
                <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </p>
            <button class="update-btn">Update Status</button>
          </div>
        `;
      });
      html += '</div>';
      
      appointmentsContainer.innerHTML = html;
      
      // Add event listeners to update buttons
      document.querySelectorAll('.update-btn').forEach(button => {
        button.addEventListener('click', function() {
          const card = this.closest('.appointment-card');
          const appointmentId = card.dataset.id;
          const newStatus = card.querySelector('.status-selector').value;
          
          db.collection('appointments').doc(appointmentId).update({
            status: newStatus
          })
          .then(() => {
            showNotification('Appointment status updated successfully!', 'success');
          })
          .catch((error) => {
            console.error("Error updating appointment: ", error);
            showNotification('Error updating appointment status.', 'error');
          });
        });
      });
    })
    .catch((error) => {
      console.error("Error getting appointments: ", error);
      appointmentsContainer.innerHTML = '<p>Error loading appointments. Please try again.</p>';
    });
}




function showDoctorModal(name, specialty, bio, edu, imageUrls = []) {
    document.getElementById('modal-doctor-name').innerText = name;
    document.getElementById('modal-doctor-specialty').innerText = specialty;
    // Consider using innerHTML if your bio has paragraph breaks or other HTML formatting
    document.getElementById('modal-doctor-bio').innerText = bio;
    document.getElementById('modal-doctor-edu').innerText = "Education: " + edu; // Adding "Education: " prefix


    const gallery = document.getElementById('modal-gallery');
    gallery.innerHTML = ''; // Clear previous images
    imageUrls.forEach(url => {
      const img = document.createElement('img');
      img.src = url; // Use the image URL/path
      img.alt = name; // Use doctor's name for alt text
      gallery.appendChild(img);
    });

    document.getElementById('doctor-modal').style.display = 'block'; // Show the modal
  }

  function closeDoctorModal() {
    document.getElementById('doctor-modal').style.display = 'none'; // Hide the modal
  }


