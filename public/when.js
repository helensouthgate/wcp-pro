// Shared date/time display helpers for the browser. Mirrors the tested logic in
// lib/fixtures.js (relativeDay / timeZoneAbbrev / formatFixtureWhen). With no
// timeZone passed, Intl uses the viewer's local zone — exactly what we want.
(function (global) {
  function ymdInZone(ms, timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(ms));
  }

  function relativeDay(utcDate, now, timeZone) {
    if (now == null) now = Date.now();
    if (!utcDate) return "";
    var t = new Date(utcDate).getTime();
    if (!isFinite(t)) return "";
    var day = ymdInZone(t, timeZone);
    if (day === ymdInZone(now, timeZone)) return "Today";
    if (day === ymdInZone(now + 86400000, timeZone)) return "Tomorrow";
    return "";
  }

  function timeZoneAbbrev(utcDate, timeZone, locale) {
    var d = utcDate ? new Date(utcDate) : new Date();
    if (isNaN(d)) return "";
    // locale undefined → use the viewer's own locale.
    var part = new Intl.DateTimeFormat(locale, {
      timeZone: timeZone, timeZoneName: "short"
    }).formatToParts(d).find(function (p) { return p.type === "timeZoneName"; });
    return part ? part.value : "";
  }

  function formatFixtureWhen(utcDate, opts) {
    opts = opts || {};
    if (!utcDate) return "TBC";
    var d = new Date(utcDate);
    if (isNaN(d)) return "TBC";
    var dateStr = new Intl.DateTimeFormat(opts.locale, {
      timeZone: opts.timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    }).format(d);
    var tz = timeZoneAbbrev(utcDate, opts.timeZone, opts.locale);
    var rel = relativeDay(utcDate, opts.now, opts.timeZone);
    return (rel ? rel + " · " : "") + dateStr + (tz ? " " + tz : "");
  }

  global.WCWhen = { relativeDay: relativeDay, timeZoneAbbrev: timeZoneAbbrev, formatFixtureWhen: formatFixtureWhen };
})(window);
