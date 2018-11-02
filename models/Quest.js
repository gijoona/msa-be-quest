const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

let QuestSchema = new Schema({
  userId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Quest', QuestSchema);
