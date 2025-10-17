#!/bin/bash
# SafeChat 集成验证脚本
# 验证所有关键文件和配置是否正确

echo "====================================================="
echo "SafeChat 生产就绪验证"
echo "====================================================="
echo ""

ERRORS=0
WARNINGS=0

# 检查函数
check_file() {
    if [ -f "$1" ]; then
        echo "✓ $1"
    else
        echo "✗ $1 不存在"
        ((ERRORS++))
    fi
}

check_js_syntax() {
    if node -c "$1" 2>/dev/null; then
        echo "✓ $1 语法正确"
    else
        echo "✗ $1 语法错误"
        ((ERRORS++))
    fi
}

echo "1. 检查配置文件..."
check_file "frontend/modern/config.js"
check_file "frontend/modern/config.example.development.js"
check_file "frontend/modern/config.example.production.js"
echo ""

echo "2. 检查配置文件语法..."
check_js_syntax "frontend/modern/config.js"
check_js_syntax "frontend/modern/config.example.development.js"
check_js_syntax "frontend/modern/config.example.production.js"
echo ""

echo "3. 检查前端代码..."
check_file "frontend/modern/app.js"
check_file "frontend/modern/admin.js"
check_file "frontend/modern/index.html"
check_file "frontend/modern/admin.html"
echo ""

echo "4. 检查前端代码语法..."
check_js_syntax "frontend/modern/app.js"
check_js_syntax "frontend/modern/admin.js"
echo ""

echo "5. 检查后端代码..."
check_file "backend/app.js"
check_file "backend/package.json"
echo ""

echo "6. 检查文档..."
check_file "README.md"
check_file "DEPLOYMENT.md"
check_file "QUICKSTART.md"
check_file "ARCHITECTURE.md"
check_file "DEPLOYMENT_CHECKLIST.md"
check_file "deploy/BAOTA_DEPLOY.md"
echo ""

echo "7. 验证 HTML 文件引用 config.js..."
if grep -q "config.js" frontend/modern/index.html; then
    echo "✓ index.html 正确引用 config.js"
else
    echo "✗ index.html 未引用 config.js"
    ((ERRORS++))
fi

if grep -q "config.js" frontend/modern/admin.html; then
    echo "✓ admin.html 正确引用 config.js"
else
    echo "✗ admin.html 未引用 config.js"
    ((ERRORS++))
fi
echo ""

echo "8. 验证 app.js 使用配置..."
if grep -q "SafeChatConfig" frontend/modern/app.js; then
    echo "✓ app.js 使用 SafeChatConfig"
else
    echo "✗ app.js 未使用 SafeChatConfig"
    ((ERRORS++))
fi
echo ""

echo "9. 验证 admin.js 使用配置..."
if grep -q "SafeChatConfig" frontend/modern/admin.js; then
    echo "✓ admin.js 使用 SafeChatConfig"
else
    echo "✗ admin.js 未使用 SafeChatConfig"
    ((ERRORS++))
fi
echo ""

echo "10. 检查 node_modules 是否被排除..."
if [ -d "backend/node_modules" ]; then
    if git check-ignore backend/node_modules >/dev/null 2>&1; then
        echo "✓ backend/node_modules 已在 .gitignore 中"
    else
        echo "⚠ backend/node_modules 未被 git 忽略"
        ((WARNINGS++))
    fi
else
    echo "- backend/node_modules 不存在（正常，运行 npm install 后会创建）"
fi
echo ""

echo "====================================================="
echo "验证结果"
echo "====================================================="

if [ $ERRORS -eq 0 ]; then
    echo "✅ 所有检查通过！"
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  警告: $WARNINGS 个"
    fi
    echo ""
    echo "SafeChat 已准备好部署到生产环境！"
    echo ""
    echo "下一步："
    echo "1. 阅读 QUICKSTART.md 了解快速部署步骤"
    echo "2. 根据部署场景配置 frontend/modern/config.js"
    echo "3. 使用 DEPLOYMENT_CHECKLIST.md 验证部署"
    exit 0
else
    echo "❌ 发现 $ERRORS 个错误"
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  警告: $WARNINGS 个"
    fi
    echo ""
    echo "请修复错误后再次运行此脚本。"
    exit 1
fi
