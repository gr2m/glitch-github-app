// Script to show filename of selected file for styled file choosers
//
//   <label class="btn">
//     Upload private key
//     <input type="file" class="manual-file-chooser" name="privateKey" id="input-private-key" required>
//   </label>
//   <strong>No file selected</strong>
//
document.querySelectorAll('.manual-file-chooser').forEach(function (input) {
  var label = input.parentElement.nextElementSibling

  input.addEventListener('change', function (e) {
    var fileName = e.target.value.split('\\').pop()
    label.innerHTML = fileName
  })
})
