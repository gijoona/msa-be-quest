const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

let QuestSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  contents: {
    type: String,
    required: true
  },
  inputDt: {
    type: Date,
    defualt: Date.now
  }
});

module.exports = mongoose.model('Quest', QuestSchema);
