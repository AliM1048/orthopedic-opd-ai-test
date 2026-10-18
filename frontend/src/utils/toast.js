import Swal from 'sweetalert2';

// App-wide toast — top-center, fading in/out rather than the library's
// default slide-and-pop; see the .opd-toast* rules in index.css for the look.
// Use these instead of window.alert() for save/create feedback.
export const notifyToast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 6000,
  timerProgressBar: true,
  showClass: { popup: 'opd-toast-in' },
  hideClass: { popup: 'opd-toast-out' },
  customClass: { popup: 'opd-toast' },
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const toastSuccess = (title, text) =>
  notifyToast.fire({ icon: 'success', title, text: text || undefined, timer: 3500 });

export const toastError = (title, text) =>
  notifyToast.fire({ icon: 'error', title, text: text || undefined });

export const toastWarning = (title, text) =>
  notifyToast.fire({ icon: 'warning', title, text: text || undefined, timer: 4500 });
