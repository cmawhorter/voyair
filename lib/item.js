
function Item(relativePath, revision, data) {
  var _relativePath, _revision;

  _relativePath = relativePath;
  Object.defineProperty(this, 'relativePath', {
    get: function() {
      return _relativePath
    },
    set: function(value) {
      _relativePath = value;
    }
  });

  _revision = revision;
  Object.defineProperty(this, 'revision', {
    get: function() {
      return _revision;
    }
  });

  this.data = data;
}

module.exports = Item;
