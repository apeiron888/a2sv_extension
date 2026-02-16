(function() {
  try {
    var code = null;
    var models = (window.monaco && window.monaco.editor) ? window.monaco.editor.getModels() : [];
    if (models && models.length) {
      var values = models.map(function(m) { return m.getValue ? m.getValue() : ''; })
        .filter(function(v) { return v && v.trim().length > 0; })
        .sort(function(a, b) { return b.length - a.length; });
      code = values.length ? values[0] : (models[0].getValue ? models[0].getValue() : null);
    }
    if (!code) {
      var ta = document.querySelector('textarea[data-cy="code-area"]');
      if (ta && ta.value) code = ta.value;
    }
    window.postMessage({ source: 'a2sv', type: 'LEETCODE_CODE', code: code || null }, '*');
  } catch (e) {
    window.postMessage({ source: 'a2sv', type: 'LEETCODE_CODE', code: null, error: e.message }, '*');
  }
})();
