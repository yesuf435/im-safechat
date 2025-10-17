import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // Auth
      'login': '登录',
      'register': '注册',
      'username': '用户名',
      'password': '密码',
      'displayName': '显示名称',
      'loginButton': '登录',
      'registerButton': '注册并登录',
      'noAccount': '没有账号？去注册',
      'haveAccount': '已有账号？去登录',
      'demoMode': '体验界面预览',
      'adminConsole': '打开后台控制台',
      
      // Navigation
      'messages': '消息',
      'contacts': '联系人',
      'notifications': '通知',
      'settings': '设置',
      
      // Messages
      'recentChats': '最近聊天',
      'noConversations': '暂无会话',
      'selectContact': '请选择联系人',
      'typeMessage': '输入消息...',
      'send': '发送',
      'newChat': '发起聊天',
      'newGroup': '创建群聊',
      'searchFriends': '搜索好友',
      
      // Contacts
      'myFriends': '我的好友',
      'groups': '群组',
      'addFriend': '添加好友',
      'searchUsers': '输入用户名查找好友',
      'noFriends': '暂无好友',
      'noGroups': '暂无群组',
      
      // Settings
      'profile': '个人资料',
      'language': '语言',
      'theme': '主题',
      'notifications_settings': '通知设置',
      'privacy': '隐私',
      'logout': '退出登录',
      
      // Common
      'confirm': '确认',
      'cancel': '取消',
      'delete': '删除',
      'edit': '编辑',
      'save': '保存',
      'loading': '加载中...',
      'error': '错误',
      'success': '成功',
      
      // Messages
      'loginFailed': '登录失败',
      'registerFailed': '注册失败',
      'sendMessageFailed': '发送消息失败',
      'loadFailed': '加载失败'
    }
  },
  en: {
    translation: {
      // Auth
      'login': 'Login',
      'register': 'Register',
      'username': 'Username',
      'password': 'Password',
      'displayName': 'Display Name',
      'loginButton': 'Login',
      'registerButton': 'Register',
      'noAccount': "Don't have an account? Register",
      'haveAccount': 'Already have an account? Login',
      'demoMode': 'Demo Mode',
      'adminConsole': 'Admin Console',
      
      // Navigation
      'messages': 'Messages',
      'contacts': 'Contacts',
      'notifications': 'Notifications',
      'settings': 'Settings',
      
      // Messages
      'recentChats': 'Recent Chats',
      'noConversations': 'No conversations',
      'selectContact': 'Select a contact',
      'typeMessage': 'Type a message...',
      'send': 'Send',
      'newChat': 'New Chat',
      'newGroup': 'New Group',
      'searchFriends': 'Search Friends',
      
      // Contacts
      'myFriends': 'My Friends',
      'groups': 'Groups',
      'addFriend': 'Add Friend',
      'searchUsers': 'Search users by username',
      'noFriends': 'No friends yet',
      'noGroups': 'No groups yet',
      
      // Settings
      'profile': 'Profile',
      'language': 'Language',
      'theme': 'Theme',
      'notifications_settings': 'Notifications',
      'privacy': 'Privacy',
      'logout': 'Logout',
      
      // Common
      'confirm': 'Confirm',
      'cancel': 'Cancel',
      'delete': 'Delete',
      'edit': 'Edit',
      'save': 'Save',
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      
      // Messages
      'loginFailed': 'Login failed',
      'registerFailed': 'Registration failed',
      'sendMessageFailed': 'Failed to send message',
      'loadFailed': 'Failed to load'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // default language
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
