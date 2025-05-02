const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
mongoose.connect('mongodb://localhost:27017/im', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  const username = 'user1';
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  const exists = await User.findOne({ username });
  if (exists) {
    console.log('✅ 用户已存在:', username);
  } else {
    const user = new User({ username, password: hashedPassword });
    await user.save();
    console.log('✅ 用户创建成功:', username);
  }

  mongoose.connection.close();
}).catch((err) => {
  console.error('❌ 数据库连接失败:', err);
  process.exit(1);
});
