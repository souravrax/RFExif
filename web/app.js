/* ShutterDrop Web — all parsing happens locally in this file + r10.js. */
(function () {
  "use strict";
  var RATED = { "Canon EOS R10": 100000 };
  var dz = document.getElementById("dropzone");
  var input = document.getElementById("file-input");
  var cards = document.getElementById("cards");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) { return n.toLocaleString("en-US"); }

  function cardHTML(name, model, shutter, experimental, rows) {
    var rated = RATED[model];
    var bar = "";
    if (shutter != null && rated) {
      var pct = Math.min(100, Math.round((shutter / rated) * 100));
      bar = '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="pct">' + pct + '% used of ' + fmt(rated) + ' rated</div>';
    }
    var badge = experimental ? '<span class="badge-exp">experimental R10 · total mech + electronic</span>' : '';
    var detail = rows.map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
    }).join('');
    return '<article class="card"><div class="model">' + esc(model) + '</div>' +
      '<span class="via">Via photo · ' + esc(name) + '</span>' +
      '<div class="count">' + (shutter != null ? fmt(shutter) : '—') + '</div>' +
      '<div class="cap">Shutter count</div>' + bar + badge +
      '<table>' + detail + '</table></article>';
  }

  function unsupportedHTML(name, reason) {
    return '<article class="card"><div class="model">' + esc(name) + '</div>' +
      '<span class="via">Via photo</span><div class="count">—</div>' +
      '<div class="cap">Shutter count</div>' +
      '<p class="muted small">' + esc(reason) + '</p></article>';
  }

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      var R = window.ShutterDropR10;
      var hit = R.findR10Shutter(bytes);
      var exif = R.readJpegExif(bytes);
      var model = exif.Model || (/\.cr3$/i.test(file.name) ? "Canon EOS R10 (from CR3)" : "Unknown model");
      var html;
      if (hit) {
        var isR10 = /R10/.test(model);
        var rows = [
          ["File", file.name + " (" + (file.size / 1048576).toFixed(1) + " MB)"],
          ["Checked", new Date().toLocaleString()]
        ];
        if (exif.DateTime) rows.push(["Taken", exif.DateTime]);
        if (exif.ISO) rows.push(["ISO", exif.ISO]);
        if (exif.ExposureTime) rows.push(["Shutter", "1/" + Math.round(1 / parseFloat(exif.ExposureTime)) + " s"]);
        if (exif.FNumber) rows.push(["Aperture", "f/" + exif.FNumber]);
        if (exif.FocalLength) rows.push(["Focal", exif.FocalLength]);
        html = cardHTML(file.name, isR10 ? "Canon EOS R10" : model, hit.value, true, rows);
      } else {
        html = unsupportedHTML(file.name,
          "No readable counter in this file. R10/R7 need an original CR3 or JPG straight from the camera — edited exports strip the MakerNote blob.");
      }
      var div = document.createElement("div");
      div.innerHTML = html;
      cards.prepend(div.firstChild);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFiles(list) {
    for (var i = 0; i < list.length; i++) handleFile(list[i]);
  }

  dz.addEventListener("click", function () { input.click(); });
  dz.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") input.click(); });
  input.addEventListener("change", function () { handleFiles(input.files); input.value = ""; });
  ["dragover", "dragenter"].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("over"); });
  });
  dz.addEventListener("drop", function (e) { handleFiles(e.dataTransfer.files); });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); });
})();
