// Admin Dashboard JavaScript Functions

// Toggle OMR public status
function toggleOMRPublic(isPublic) {
    fetch('/admin/omr/public', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublic })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            alert('An error occurred while updating OMR status');
        });
}

// Toggle Results public status
function toggleResultsPublic(isPublic) {
    fetch('/admin/results/public', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublic })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            alert('An error occurred while updating results status');
        });
}

// Clean up all modal backdrops and reset page state
function cleanupModalBackdrops() {
    // Remove any lingering modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
    });

    // Remove modal-open class from body
    document.body.classList.remove('modal-open');

    // Reset body styles that might be set by Bootstrap
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Ensure the page is interactive
    document.body.style.pointerEvents = '';
}

// View OMR image
function viewOMR(url, rollNo) {
    // Clean up any existing modal issues first
    cleanupModalBackdrops();

    const modal = document.getElementById('omrViewModal');
    const modalImg = document.getElementById('omrImage');
    const modalTitle = document.getElementById('omrModalTitle');

    if (modalTitle) modalTitle.textContent = `OMR Sheet - ${rollNo}`;
    if (modalImg) modalImg.src = url;

    // Get existing instance or create new one
    let bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (!bootstrapModal) {
        bootstrapModal = new bootstrap.Modal(modal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }

    // Add cleanup listener for when modal is hidden
    modal.addEventListener('hidden.bs.modal', function () {
        cleanupModalBackdrops();
        if (modalImg) modalImg.src = ''; // Clear image source
    }, { once: true });

    bootstrapModal.show();
}

// Upload OMR for specific student
function uploadOMRForStudent(rollNo) {
    cleanupModalBackdrops();

    const rollNoInput = document.getElementById('omrRollNo');
    const modal = document.getElementById('uploadOMRModal');

    if (rollNoInput) rollNoInput.value = rollNo;

    let bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (!bootstrapModal) {
        bootstrapModal = new bootstrap.Modal(modal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }

    modal.addEventListener('hidden.bs.modal', function () {
        cleanupModalBackdrops();
    }, { once: true });

    bootstrapModal.show();
}

// Delete OMR
function deleteOMR(rollNo) {
    // Prevent double execution
    if (window.deleteOMRInProgress) return;
    window.deleteOMRInProgress = true;

    if (confirm(`Are you sure you want to delete the OMR sheet for ${rollNo}?`)) {
        fetch(`/admin/omr/${rollNo}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                alert('An error occurred while deleting OMR');
            })
            .finally(() => {
                window.deleteOMRInProgress = false;
            });
    } else {
        window.deleteOMRInProgress = false;
    }
}

// Edit student
function editStudent(rollNo) {
    fetch(`/admin/students/${rollNo}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cleanupModalBackdrops();

                const student = data.student;
                const editRollNo = document.getElementById('editRollNo');
                const editName = document.getElementById('editName');
                const editDob = document.getElementById('editDob');
                const editMobile = document.getElementById('editMobile');
                const editPostApplied = document.getElementById('editPostApplied');

                if (editRollNo) editRollNo.value = student.rollNo;
                if (editName) editName.value = student.name;
                if (editDob) editDob.value = new Date(student.dob).toLocaleDateString('en-GB');
                if (editMobile) editMobile.value = student.mobile;
                if (editPostApplied) editPostApplied.value = student.postApplied;

                const modal = document.getElementById('editStudentModal');
                let bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (!bootstrapModal) {
                    bootstrapModal = new bootstrap.Modal(modal, {
                        backdrop: true,
                        keyboard: true,
                        focus: true
                    });
                }

                modal.addEventListener('hidden.bs.modal', function () {
                    cleanupModalBackdrops();
                }, { once: true });

                bootstrapModal.show();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            alert('An error occurred while fetching student data');
        });
}

// Delete student
function deleteStudent(rollNo) {
    // Prevent double execution
    if (window.deleteStudentInProgress) return;
    window.deleteStudentInProgress = true;

    if (confirm(`Are you sure you want to delete student ${rollNo}? This action cannot be undone.`)) {
        fetch(`/admin/students/${rollNo}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById(`student-${rollNo}`).remove();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting student');
            })
            .finally(() => {
                window.deleteStudentInProgress = false;
            });
    } else {
        window.deleteStudentInProgress = false;
    }
}

// View student results
function viewResults(rollNo) {
    fetch(`/admin/students/${rollNo}/results`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cleanupModalBackdrops();

                const results = data.results;
                const breakdown = data.breakdown;

                const resultsRollNo = document.getElementById('resultsRollNo');
                const resultsCorrect = document.getElementById('resultsCorrect');
                const resultsWrong = document.getElementById('resultsWrong');
                const resultsUnattempted = document.getElementById('resultsUnattempted');
                const resultsFinalScore = document.getElementById('resultsFinalScore');
                const resultsPercentage = document.getElementById('resultsPercentage');

                if (resultsRollNo) resultsRollNo.textContent = rollNo;
                if (resultsCorrect) resultsCorrect.textContent = results.correctAnswers;
                if (resultsWrong) resultsWrong.textContent = results.wrongAnswers;
                if (resultsUnattempted) resultsUnattempted.textContent = results.unattempted;
                if (resultsFinalScore) resultsFinalScore.textContent = results.finalScore;
                if (resultsPercentage) resultsPercentage.textContent = results.percentage ? results.percentage + '%' : 'N/A';

                const modal = document.getElementById('viewResultsModal');
                let bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (!bootstrapModal) {
                    bootstrapModal = new bootstrap.Modal(modal, {
                        backdrop: true,
                        keyboard: true,
                        focus: true
                    });
                }

                modal.addEventListener('hidden.bs.modal', function () {
                    cleanupModalBackdrops();
                }, { once: true });

                bootstrapModal.show();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while fetching results');
        });
}

// Edit student results
function editResults(rollNo) {
    fetch(`/admin/students/${rollNo}/results`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const results = data.results;
                document.getElementById('editResultsRollNo').value = rollNo;
                document.getElementById('editCorrectAnswers').value = results.correctAnswers;
                document.getElementById('editWrongAnswers').value = results.wrongAnswers;
                document.getElementById('editUnattempted').value = results.unattempted;
                document.getElementById('editFinalScore').value = results.finalScore;
                document.getElementById('editPercentage').value = results.percentage || '';

                const modal = new bootstrap.Modal(document.getElementById('editResultsModal'));
                modal.show();
            } else {
                // If no results exist, open modal with empty values for adding new results
                document.getElementById('editResultsRollNo').value = rollNo;
                document.getElementById('editCorrectAnswers').value = '';
                document.getElementById('editWrongAnswers').value = '';
                document.getElementById('editUnattempted').value = '';
                document.getElementById('editFinalScore').value = '';
                document.getElementById('editPercentage').value = '';

                const modal = new bootstrap.Modal(document.getElementById('editResultsModal'));
                modal.show();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while fetching results');
        });
}

// Delete student results
function deleteResults(rollNo) {
    // Prevent double execution
    if (window.deleteResultsInProgress) return;
    window.deleteResultsInProgress = true;

    if (confirm(`Are you sure you want to delete the results for ${rollNo}?`)) {
        fetch(`/admin/students/${rollNo}/results`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting results');
            })
            .finally(() => {
                window.deleteResultsInProgress = false;
            });
    } else {
        window.deleteResultsInProgress = false;
    }
}

// Add results for student
function addResultsForStudent(rollNo) {
    cleanupModalBackdrops();

    const resultsRollNoInput = document.getElementById('resultsRollNo');
    const resultsCorrectAnswers = document.getElementById('resultsCorrectAnswers');
    const resultsWrongAnswers = document.getElementById('resultsWrongAnswers');
    const resultsUnattempted = document.getElementById('resultsUnattempted');
    const resultsFinalScore = document.getElementById('resultsFinalScore');
    const resultsPercentage = document.getElementById('resultsPercentage');
    const addResultsModalLabel = document.getElementById('addResultsModalLabel');

    if (resultsRollNoInput) resultsRollNoInput.value = rollNo;
    if (resultsCorrectAnswers) resultsCorrectAnswers.value = '';
    if (resultsWrongAnswers) resultsWrongAnswers.value = '';
    if (resultsUnattempted) resultsUnattempted.value = '';
    if (resultsFinalScore) resultsFinalScore.value = '';
    if (resultsPercentage) resultsPercentage.value = '';
    if (addResultsModalLabel) addResultsModalLabel.textContent = 'Add Results for ' + rollNo;

    const modal = document.getElementById('addResultsModal');
    let bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (!bootstrapModal) {
        bootstrapModal = new bootstrap.Modal(modal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }

    modal.addEventListener('hidden.bs.modal', function () {
        cleanupModalBackdrops();
    }, { once: true });

    bootstrapModal.show();
}

// Upload answer key for specific post
function uploadAnswerKeyForPost(postType) {
    // Set the post type in the form and switch to answer key tab
    const postTypeSelect = document.getElementById('postType');
    const answerKeyTab = document.getElementById('answer-key-tab');
    const answerKeyFile = document.getElementById('answerKeyFile');

    if (postTypeSelect) postTypeSelect.value = postType;
    if (answerKeyTab) answerKeyTab.click();
    if (answerKeyFile) answerKeyFile.focus();
}

// Toggle answer key publication
function toggleAnswerKeyPublication(postType, isPublished) {
    fetch('/admin/answer-key/publish', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postType, isPublished })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating answer key status');
        });
}

// Toggle all answer keys publication
function toggleAllAnswerKeys(isPublished) {
    const action = isPublished ? 'publish' : 'unpublish';
    if (confirm(`Are you sure you want to ${action} all answer keys?`)) {
        fetch('/admin/answer-key/publish-all', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPublished })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating answer keys');
            });
    }
}

// Delete answer key
function deleteAnswerKey(postType) {
    // Prevent double execution
    if (window.deleteAnswerKeyInProgress) return;
    window.deleteAnswerKeyInProgress = true;

    if (confirm(`Are you sure you want to delete the answer key for ${postType}?`)) {
        fetch('/admin/answer-key/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ postType })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting answer key');
            })
            .finally(() => {
                window.deleteAnswerKeyInProgress = false;
            });
    } else {
        window.deleteAnswerKeyInProgress = false;
    }
}

// File input change handlers for showing file info
function setupFileInputHandlers() {
    const fileInputs = [
        { id: 'studentExcel', maxSize: 10 * 1024 * 1024, types: ['.xlsx', '.xls'] }, // 10MB
        { id: 'omrZip', maxSize: 250 * 1024 * 1024, types: ['.zip'] }, // 250MB
        { id: 'answerKeyFile', maxSize: 10 * 1024 * 1024, types: ['.pdf', '.jpg', '.jpeg', '.png'] }, // 10MB
        { id: 'omrFile', maxSize: 10 * 1024 * 1024, types: ['.pdf', '.jpg', '.jpeg', '.png'] }, // 10MB
        { id: 'objectionFile', maxSize: 10 * 1024 * 1024, types: ['.pdf'] } // 10MB, PDF only
    ];

    fileInputs.forEach(config => {
        const input = document.getElementById(config.id);
        if (input) {
            input.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    // Remove existing file info
                    const existingInfo = input.parentNode.querySelector('.file-info');
                    if (existingInfo) existingInfo.remove();

                    const fileInfo = document.createElement('div');
                    fileInfo.className = 'file-info mt-1 small';

                    // Validate file size
                    if (file.size > config.maxSize) {
                        fileInfo.className += ' text-danger';
                        fileInfo.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>${file.name} (${formatFileSize(file.size)}) - File too large! Max: ${formatFileSize(config.maxSize)}`;
                        input.value = ''; // Clear the input
                    } else {
                        // Validate file type
                        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
                        if (!config.types.includes(fileExt)) {
                            fileInfo.className += ' text-warning';
                            fileInfo.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>${file.name} (${formatFileSize(file.size)}) - Unsupported file type. Allowed: ${config.types.join(', ')}`;
                            input.value = ''; // Clear the input
                        } else {
                            fileInfo.className += ' text-success';
                            fileInfo.innerHTML = `<i class="fas fa-check-circle me-1"></i>${file.name} (${formatFileSize(file.size)}) - Ready to upload`;
                        }
                    }

                    // Add new file info
                    input.parentNode.appendChild(fileInfo);
                }
            });
        }
    });
}

// Initialize dashboard functionality
document.addEventListener('DOMContentLoaded', function () {
    setupFileInputHandlers();
    // Global cleanup function that runs periodically
    setInterval(function () {
        // Check if there are any orphaned modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const openModals = document.querySelectorAll('.modal.show');

        // If there are backdrops but no open modals, clean them up
        if (backdrops.length > 0 && openModals.length === 0) {
            cleanupModalBackdrops();
        }
    }, 2000); // Check every 2 seconds

    // Also clean up on any click that might be blocked
    document.addEventListener('click', function (e) {
        // If click is on a backdrop, clean it up
        if (e.target.classList.contains('modal-backdrop')) {
            cleanupModalBackdrops();
        }
    });
    // Handle event delegation for all interactive elements
    document.addEventListener('click', function (e) {
        const button = e.target.closest('button');
        if (!button) return;

        // Handle data-action buttons
        const action = button.dataset.action;
        if (action) {
            // Prevent default for data-action buttons
            e.preventDefault();
            e.stopPropagation();
            switch (action) {
                case 'toggle-omr':
                    const omrPublic = button.dataset.public === 'true';
                    toggleOMRPublic(omrPublic);
                    break;
                case 'toggle-results':
                    const resultsPublic = button.dataset.public === 'true';
                    toggleResultsPublic(resultsPublic);
                    break;
                case 'refresh':
                    location.reload();
                    break;
                case 'view-omr':
                    const omrUrl = button.dataset.url;
                    const omrRoll = button.dataset.roll;
                    viewOMR(omrUrl, omrRoll);
                    break;
                case 'upload-omr':
                    const uploadRoll = button.dataset.roll;
                    uploadOMRForStudent(uploadRoll);
                    break;
                case 'delete-omr':
                    const deleteOmrRoll = button.dataset.roll;
                    deleteOMR(deleteOmrRoll);
                    break;
                case 'edit-student':
                    const editRoll = button.dataset.roll;
                    editStudent(editRoll);
                    break;
                case 'delete-student':
                    const deleteRoll = button.dataset.roll;
                    deleteStudent(deleteRoll);
                    break;
                case 'view-results':
                    const viewResultsRoll = button.dataset.roll;
                    viewResults(viewResultsRoll);
                    break;
                case 'edit-results':
                    const editResultsRoll = button.dataset.roll;
                    editResults(editResultsRoll);
                    break;
                case 'add-results':
                    const addResultsRoll = button.dataset.roll;
                    addResultsForStudent(addResultsRoll);
                    break;
                case 'delete-results':
                    const deleteResultsRoll = button.dataset.roll;
                    deleteResults(deleteResultsRoll);
                    break;
                case 'toggle-answer-key':
                    const post = button.dataset.post;
                    const published = button.dataset.published === 'true';
                    toggleAnswerKeyPublication(post, published);
                    break;
                case 'delete-answer-key':
                    const deletePost = button.dataset.post;
                    deleteAnswerKey(deletePost);
                    break;
                case 'toggle-all-answer-keys':
                    const publishAll = button.dataset.publish === 'true';
                    toggleAllAnswerKeys(publishAll);
                    break;
                case 'upload-answer-key':
                    const uploadPost = button.dataset.post;
                    uploadAnswerKeyForPost(uploadPost);
                    break;
                case 'toggle-objection-doc':
                    const docType = button.dataset.type;
                    const isActive = button.dataset.active === 'true';
                    toggleObjectionDoc(docType, isActive);
                    break;
                case 'delete-objection-doc':
                    const deleteDocType = button.dataset.type;
                    deleteObjectionDoc(deleteDocType);
                    break;
                case 'upload-objection-doc':
                    const uploadDocType = button.dataset.type;
                    uploadObjectionDoc(uploadDocType);
                    break;
            }
            return;
        }

        // Handle onclick attributes (fallback for existing inline handlers)
        const onclick = button.getAttribute('onclick');
        if (onclick) {
            // Only prevent default for onclick buttons that are not submit buttons
            const isSubmitButton = button.type === 'submit' || button.getAttribute('type') === 'submit';
            if (!isSubmitButton) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Extract function name and parameters from onclick
            const match = onclick.match(/(\w+)\((.*)\)/);
            if (match) {
                const funcName = match[1];
                const params = match[2];

                // Call the appropriate function
                if (window[funcName]) {
                    try {
                        // Safely evaluate parameters
                        const args = params.split(',').map(param => {
                            param = param.trim();
                            if (param.startsWith("'") && param.endsWith("'")) {
                                return param.slice(1, -1); // Remove quotes
                            }
                            if (param.startsWith('"') && param.endsWith('"')) {
                                return param.slice(1, -1); // Remove double quotes
                            }
                            if (param === 'true') return true;
                            if (param === 'false') return false;
                            if (!isNaN(param) && param !== '') return Number(param);
                            return param;
                        });
                        window[funcName].apply(null, args);
                    } catch (error) {
                        // Silently handle onclick errors
                    }
                }
            }
        }
    }, true); // Use capture phase to catch events early

    // Student search functionality
    const studentSearch = document.getElementById('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#students tbody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Form submissions
    const editStudentForm = document.getElementById('editStudentForm');
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const rollNo = formData.get('rollNo');

            fetch(`/admin/students/${rollNo}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    dob: formData.get('dob'),
                    mobile: formData.get('mobile'),
                    postApplied: formData.get('postApplied')
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while updating student');
                });
        });
    }

    const editResultsForm = document.getElementById('editResultsForm');
    if (editResultsForm) {
        editResultsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const rollNo = formData.get('rollNo');

            fetch(`/admin/students/${rollNo}/results`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    correctAnswers: formData.get('correctAnswers'),
                    wrongAnswers: formData.get('wrongAnswers'),
                    unattempted: formData.get('unattempted'),
                    finalScore: formData.get('finalScore'),
                    percentage: formData.get('percentage')
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while updating results');
                });
        });
    }

    const uploadOMRForm = document.getElementById('uploadOMRForm');
    if (uploadOMRForm) {
        uploadOMRForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const progressContainer = document.getElementById('omrUploadProgress');
            const progressBar = document.getElementById('omrProgressBar');
            const progressText = document.getElementById('omrProgressText');

            // Show progress container and disable submit button
            if (progressContainer) progressContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Uploading...';
            }

            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();
            let startTime = Date.now();

            // Track upload progress
            xhr.upload.addEventListener('progress', function (e) {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = e.loaded / elapsed;
                    const remaining = (e.total - e.loaded) / speed;

                    if (progressBar) {
                        progressBar.style.width = percentComplete + '%';
                        progressBar.setAttribute('aria-valuenow', percentComplete);
                        progressBar.textContent = percentComplete + '%';
                    }
                    if (progressText) {
                        const sizeText = formatFileSize(e.loaded) + ' / ' + formatFileSize(e.total);
                        const speedText = elapsed > 1 ? ` at ${formatSpeed(speed)}` : '';
                        const timeText = remaining > 1 && elapsed > 1 ? ` • ${formatTime(remaining)} remaining` : '';
                        progressText.textContent = `Uploading ${sizeText}${speedText}${timeText}`;
                    }
                }
            });

            xhr.onload = function () {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.success) {
                        if (progressBar) {
                            progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                            progressBar.classList.add('bg-success');
                            progressBar.style.width = '100%';
                            progressBar.textContent = '✓ Complete';
                        }
                        if (progressText) progressText.textContent = '✓ Upload complete! Refreshing page...';
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        alert('Error: ' + data.message);
                        resetUploadForm();
                    }
                } catch (error) {
                    alert('An error occurred while uploading OMR');
                    resetUploadForm();
                }
            };

            xhr.onerror = function () {
                alert('An error occurred while uploading OMR');
                resetUploadForm();
            };

            function resetUploadForm() {
                if (progressContainer) progressContainer.style.display = 'none';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-upload me-1"></i>Upload OMR';
                }
                if (progressBar) {
                    progressBar.style.width = '0%';
                    progressBar.setAttribute('aria-valuenow', 0);
                    progressBar.textContent = '';
                }
                if (progressText) progressText.textContent = '';
            }

            xhr.open('POST', '/admin/omr/single');
            xhr.send(formData);
        });
    }

    // Add Results Form - handled by embedded JavaScript in dashboard.ejs

    // Handle forms with progress tracking
    const bulkOMRForm = document.getElementById('bulkOMRForm');
    if (bulkOMRForm) {
        bulkOMRForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const progressContainer = document.getElementById('bulkOMRProgress');
            const progressBar = document.getElementById('bulkOMRProgressBar');
            const progressText = document.getElementById('bulkOMRProgressText');

            // Show progress and disable submit
            if (progressContainer) progressContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing ZIP...';
            }

            uploadWithProgress('/admin/omr/bulk', formData, progressBar, progressText, submitBtn, 'ZIP processed successfully!');
        });
    }

    const answerKeyForm = document.getElementById('answerKeyForm');
    if (answerKeyForm) {
        answerKeyForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const progressContainer = document.getElementById('answerKeyProgress');
            const progressBar = document.getElementById('answerKeyProgressBar');
            const progressText = document.getElementById('answerKeyProgressText');

            // Show progress and disable submit
            if (progressContainer) progressContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Uploading...';
            }

            uploadWithProgress('/admin/answer-key', formData, progressBar, progressText, submitBtn, 'Answer key uploaded successfully!');
        });
    }

    const bulkStudentForm = document.getElementById('bulkStudentForm');
    if (bulkStudentForm) {
        bulkStudentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const progressContainer = document.getElementById('bulkStudentProgress');
            const progressBar = document.getElementById('bulkStudentProgressBar');
            const progressText = document.getElementById('bulkStudentProgressText');

            // Show progress and disable submit
            if (progressContainer) progressContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing Excel...';
            }

            uploadWithProgress('/admin/students/bulk', formData, progressBar, progressText, submitBtn, 'Students imported successfully!');
        });
    }

    // Generic upload with progress function
    function uploadWithProgress(url, formData, progressBar, progressText, submitBtn, successMessage) {
        const xhr = new XMLHttpRequest();
        let startTime = Date.now();

        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = e.loaded / elapsed;
                const remaining = (e.total - e.loaded) / speed;

                if (progressBar) {
                    progressBar.style.width = percentComplete + '%';
                    progressBar.setAttribute('aria-valuenow', percentComplete);
                    progressBar.textContent = percentComplete + '%';
                }
                if (progressText) {
                    const sizeText = formatFileSize(e.loaded) + ' / ' + formatFileSize(e.total);
                    const speedText = elapsed > 1 ? ` at ${formatSpeed(speed)}` : '';
                    const timeText = remaining > 1 ? ` • ${formatTime(remaining)} remaining` : '';
                    progressText.textContent = `Uploading ${sizeText}${speedText}${timeText}`;
                }
            }
        });

        xhr.onload = function () {
            if (progressBar) {
                progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                progressBar.classList.add('bg-success');
                progressBar.style.width = '100%';
                progressBar.textContent = '✓ Complete';
            }
            if (progressText) progressText.textContent = '✓ ' + successMessage + ' Refreshing page...';
            setTimeout(() => location.reload(), 1500);
        };

        xhr.onerror = function () {
            alert('An error occurred during upload');
            resetFormState(submitBtn, progressBar, progressText);
        };

        xhr.open('POST', url);
        xhr.send(formData);
    }

    // Helper function to format file sizes
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to format upload speed
    function formatSpeed(bytesPerSecond) {
        return formatFileSize(bytesPerSecond) + '/s';
    }

    // Helper function to format time
    function formatTime(seconds) {
        if (seconds < 60) return Math.round(seconds) + 's';
        if (seconds < 3600) return Math.round(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's';
        return Math.round(seconds / 3600) + 'h ' + Math.round((seconds % 3600) / 60) + 'm';
    }

    function resetFormState(submitBtn, progressBar, progressText) {
        if (submitBtn) {
            submitBtn.disabled = false;
            const originalText = submitBtn.dataset.originalText;
            if (originalText) {
                submitBtn.innerHTML = originalText;
            } else {
                submitBtn.innerHTML = '<i class="fas fa-upload me-1"></i>Upload';
            }
        }
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
            progressBar.textContent = '';
        }
        if (progressText) progressText.textContent = '';
    }

    // Handle forms that should submit normally (not via AJAX)
    const normalForms = [
        'addStudentForm' // Add student form
    ];

    normalForms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            // Allow normal form submission
        }
    });
});

//Objection Document Management Functions
function toggleObjectionDoc(documentType, isActive) {
    fetch('/admin/objection-docs/toggle', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentType: documentType, isActive: isActive })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating objection document status');
        });
}

function deleteObjectionDoc(documentType) {
    // Prevent double execution
    if (window.deleteObjectionDocInProgress) return;
    window.deleteObjectionDocInProgress = true;

    const docTypeName = documentType === 'guidelines' ? 'Guidelines' : 'Form';
    if (confirm(`Are you sure you want to delete the ${docTypeName} document?`)) {
        fetch(`/admin/objection-docs/${documentType}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting objection document');
            })
            .finally(() => {
                window.deleteObjectionDocInProgress = false;
            });
    } else {
        window.deleteObjectionDocInProgress = false;
    }
}

function uploadObjectionDoc(documentType) {
    const documentTypeSelect = document.getElementById('documentType');
    const objectionFile = document.getElementById('objectionFile');

    if (documentTypeSelect) documentTypeSelect.value = documentType;

    // Scroll to upload form
    const objectionDocForm = document.getElementById('objectionDocForm');
    if (objectionDocForm) {
        objectionDocForm.scrollIntoView({ behavior: 'smooth' });
    }

    if (objectionFile) objectionFile.focus();
}