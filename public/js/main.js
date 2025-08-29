// Main JavaScript file for OMR Result Viewer

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // Form validation enhancement
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // File upload progress (if needed)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileName = this.files[0]?.name;
            const label = this.nextElementSibling;
            if (label && label.classList.contains('form-label')) {
                const originalText = label.textContent;
                if (fileName) {
                    label.textContent = `${originalText} - ${fileName}`;
                    label.style.color = '#28a745';
                }
            }
        });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Loading state for buttons (exclude admin login and other forms that handle their own state)
    const submitButtons = document.querySelectorAll('button[type="submit"]:not(#adminLoginForm button):not(.no-loading-state)');
    submitButtons.forEach(button => {
        const form = button.closest('form');
        if (form) {
            form.addEventListener('submit', function(e) {
                // Only show loading if form is valid
                if (form.checkValidity() && !form.id.includes('Login')) {
                    button.disabled = true;
                    const originalText = button.innerHTML;
                    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
                    
                    // Store original text for restoration
                    button.setAttribute('data-original-text', originalText);
                    
                    // Re-enable button after 8 seconds as fallback
                    setTimeout(() => {
                        button.disabled = false;
                        button.innerHTML = originalText;
                    }, 8000);
                }
            });
        }
    });

    // Reset button states on page load (in case of redirect back)
    submitButtons.forEach(button => {
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    });

    // Table search functionality (if needed)
    const searchInputs = document.querySelectorAll('.table-search');
    searchInputs.forEach(input => {
        input.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const table = document.querySelector(this.dataset.target);
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    });

    // Confirmation dialogs for delete actions
    const deleteButtons = document.querySelectorAll('.btn-delete, .delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const confirmMessage = this.dataset.confirm || 'Are you sure you want to delete this item?';
            if (!confirm(confirmMessage)) {
                e.preventDefault();
                return false;
            }
        });
    });

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    // Format mobile number inputs (only digits, max 10) - Skip student login form to avoid conflicts
    const mobileInputs = document.querySelectorAll('input[type="tel"]:not(#mobile), input[name="mobile"]:not(#mobile)');
    mobileInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            // Only allow digits and limit to 10 characters
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
        });
        
        input.addEventListener('paste', function(e) {
            // Handle paste events
            setTimeout(() => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
            }, 0);
        });
    });

    // Copy to clipboard functionality
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = document.querySelector(this.dataset.target);
            if (target) {
                navigator.clipboard.writeText(target.textContent).then(() => {
                    showToast('Copied to clipboard!', 'success');
                });
            }
        });
    });

    // Image preview for file uploads
    const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    imageInputs.forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    let preview = document.querySelector(`#${input.id}-preview`);
                    if (!preview) {
                        preview = document.createElement('img');
                        preview.id = `${input.id}-preview`;
                        preview.className = 'img-thumbnail mt-2';
                        preview.style.maxWidth = '200px';
                        input.parentNode.appendChild(preview);
                    }
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });
});

// Utility functions
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    const toast = createToast(message, type);
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
    return container;
}

function createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    
    const typeColors = {
        success: 'text-bg-success',
        error: 'text-bg-danger',
        warning: 'text-bg-warning',
        info: 'text-bg-info'
    };
    
    toast.innerHTML = `
        <div class="toast-header ${typeColors[type] || typeColors.info}">
            <strong class="me-auto">Notification</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    return toast;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Student login form functionality (moved from index.ejs)
function initializeStudentLoginForm() {
    const mobileInput = document.getElementById('mobile');

    // Simple mobile number formatting - only digits, max 10
    if (mobileInput) {
        mobileInput.addEventListener('input', function (e) {
            // Remove all non-digits and limit to 10
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
        });

        // Handle paste events
        mobileInput.addEventListener('paste', function (e) {
            setTimeout(() => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
            }, 0);
        });
    }

    // Auto-focus roll number field
    const rollNoInput = document.getElementById('rollNo');
    if (rollNoInput) {
        rollNoInput.focus();
    }
    
    // Let the form submit naturally - no interference like admin login
}

// Initialize student login form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeStudentLoginForm();
});

// Loading state for buttons (exclude admin login and other forms that handle their own state)
const submitButtons = document.querySelectorAll('button[type="submit"]:not(#adminLoginForm button):not(.no-loading-state)');
submitButtons.forEach(button => {
    const form = button.closest('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            // Only show loading if form is valid
            if (form.checkValidity() && !form.id.includes('Login')) {
                button.disabled = true;
                const originalText = button.innerHTML;
                button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
                
                // Store original text for restoration
                button.setAttribute('data-original-text', originalText);
                
                // Re-enable button after 8 seconds as fallback
                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = originalText;
                }, 8000);
            }
        });
    }
});

// Reset button states on page load (in case of redirect back)
submitButtons.forEach(button => {
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
        button.disabled = false;
        button.innerHTML = originalText;
    }
});

// Table search functionality (if needed)
const searchInputs = document.querySelectorAll('.table-search');
searchInputs.forEach(input => {
    input.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        const table = document.querySelector(this.dataset.target);
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
});

// Confirmation dialogs for delete actions
const deleteButtons = document.querySelectorAll('.btn-delete, .delete-btn');
deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        const confirmMessage = this.dataset.confirm || 'Are you sure you want to delete this item?';
        if (!confirm(confirmMessage)) {
            e.preventDefault();
            return false;
        }
    });
});

// Auto-resize textareas
const textareas = document.querySelectorAll('textarea');
textareas.forEach(textarea => {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
});

// Format mobile number inputs (only digits, max 10) - Skip student login form to avoid conflicts
const mobileInputs = document.querySelectorAll('input[type="tel"]:not(#mobile), input[name="mobile"]:not(#mobile)');
mobileInputs.forEach(input => {
    input.addEventListener('input', function(e) {
        // Only allow digits and limit to 10 characters
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
    });
    
    input.addEventListener('paste', function(e) {
        // Handle paste events
        setTimeout(() => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
        }, 0);
    });
});

// Copy to clipboard functionality
const copyButtons = document.querySelectorAll('.copy-btn');
copyButtons.forEach(button => {
    button.addEventListener('click', function() {
        const target = document.querySelector(this.dataset.target);
        if (target) {
            navigator.clipboard.writeText(target.textContent).then(() => {
                showToast('Copied to clipboard!', 'success');
            });
        }
    });
});

// Image preview for file uploads
const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
imageInputs.forEach(input => {
    input.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                let preview = document.querySelector(`#${input.id}-preview`);
                if (!preview) {
                    preview = document.createElement('img');
                    preview.id = `${input.id}-preview`;
                    preview.className = 'img-thumbnail mt-2';
                    preview.style.maxWidth = '200px';
                    input.parentNode.appendChild(preview);
                }
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
});

// Export functions for global use
window.showToast = showToast;
window.formatFileSize = formatFileSize;
window.validateForm = validateForm;