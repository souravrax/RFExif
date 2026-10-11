// Loads every cameras/*/camera.toml manifest (+ optional web.js escape
// hatch) and builds the shared registry. Single place the UI touches.
import { createRegistry } from "../../cameras/_shared/registry.js";
import { loadManifest } from "../../cameras/_shared/manifest.js";

var tomls = import.meta.glob("../../cameras/*/camera.toml", {
  query: "?raw",
  import: "default",
  eager: true,
});
var customs = import.meta.glob("../../cameras/*/web.js", { eager: true });

export function loadCameras() {
  var manifests = [];
  for (var p of Object.keys(tomls)) {
    var dir = p.split("/").slice(-2, -1)[0];
    if (dir.charAt(0) === "_") continue;
    var m = loadManifest(tomls[p], dir);
    var ck = Object.keys(customs).find(function (k) {
      return k.indexOf("/" + dir + "/web.js") >= 0;
    });
    if (ck) {
      var extra = customs[ck].default || [];
      m.strategies = m.strategies.concat(extra);
    }
    manifests.push(m);
  }
  return createRegistry(manifests);
}
