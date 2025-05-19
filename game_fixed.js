document.addEventListener('DOMContentLoaded', () => {
    // 音效
    const AUDIO = {
        merge: new Audio('https://assets.mixkit.co/active_storage/sfx/212/212.wav'),
        select: new Audio('https://assets.mixkit.co/active_storage/sfx/270/270.wav'),
        gameOver: new Audio('https://assets.mixkit.co/active_storage/sfx/209/209.wav'),
        success: new Audio('https://assets.mixkit.co/active_storage/sfx/218/218.wav'),
        timeWarning: new Audio('https://assets.mixkit.co/active_storage/sfx/255/255.wav'),
        newTile: new Audio('https://assets.mixkit.co/active_storage/sfx/249/249.wav')
    };
    
    // 调整音量
    Object.values(AUDIO).forEach(audio => {
        audio.volume = 0.3;
    });
    
    // 压力指示器元素
    const pressureIndicator = document.getElementById('pressure-indicator');
    // 全局状态变量
    let grid = Array(4).fill().map(() => Array(4).fill(0)); // 4x4游戏格子
    let score = 0; // 当前分数
    let steps = 60; // 剩余步数
    let time = 0; // 游戏时间（秒）
    let timerInterval; // 计时器
    let stepsReductionInterval; // 步数减少计时器
    let selectedTile = null; // 当前选中的方块
    let gameActive = false; // 游戏是否进行中
    let warningPlayed = false; // 是否已播放警告音效
    let lastHighTile = 0; // 上一次出现的最高数值方块
    
    // DOM元素
    const gridContainer = document.querySelector('.grid-container');
    const scoreDisplay = document.getElementById('score');
    const stepsDisplay = document.getElementById('steps');
    const timerDisplay = document.getElementById('timer');
    const restartButton = document.getElementById('restart-button');
    const restartButtonModal = document.getElementById('restart-button-modal');
    const gameOverModal = document.getElementById('game-over');
    const gameOverMessage = document.getElementById('game-over-message');
    const gameOverScore = document.getElementById('game-over-score');
    const gameOverTime = document.getElementById('game-over-time');
    const gameOverSteps = document.getElementById('game-over-steps');
    const gameOverRating = document.getElementById('game-over-rating');
    const leaderboardBody = document.getElementById('leaderboard-body');
    
    // 初始化游戏
    function initGame() {
        // 重置游戏状态
        grid = Array(4).fill().map(() => Array(4).fill(0));
        score = 0;
        steps = 60;
        time = 0;
        selectedTile = null;
        gameActive = true;
        
        // 更新显示
        updateDisplay();
        
        // 清除所有方块
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => tile.remove());
        
        // 生成初始方块（8个）
        for (let i = 0; i < 8; i++) {
            addRandomTile();
        }
        
        // 启动计时器
        startTimer();
    }
    
    // 启动计时器
    function startTimer() {
        clearInterval(timerInterval);
        clearInterval(stepsReductionInterval);
        
        // 每秒更新时间
        timerInterval = setInterval(() => {
            time++;
            updateDisplay();
        }, 1000);
        
        // 每30秒减少一步
        stepsReductionInterval = setInterval(() => {
            steps--;
            updateDisplay();
            checkGameOver();
        }, 30000);
    }
    
    // 停止计时器
    function stopTimer() {
        clearInterval(timerInterval);
        clearInterval(stepsReductionInterval);
    }
    
    // 更新显示
    function updateDisplay() {
        // 更新分数，并添加跳跃动画效果
        scoreDisplay.textContent = score;
        scoreDisplay.style.animation = 'none';
        scoreDisplay.offsetHeight; // 触发重绘
        scoreDisplay.style.animation = 'bounce 0.5s';
        
        // 更新步数
        stepsDisplay.textContent = steps;
        
        // 当步数较少时，添加视觉警告
        if (steps <= 15) {
            stepsDisplay.style.animation = 'timeFlash 1s infinite';
            // 当步数为10且警告音效未播放时，播放警告音效
            if (steps === 10 && !warningPlayed) {
                AUDIO.timeWarning.play();
                warningPlayed = true;
            }
        } else {
            stepsDisplay.style.animation = 'none';
            warningPlayed = false;
        }
        
        // 格式化时间为 分:秒
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;
        
        // 更新压力指示器
        updatePressureIndicator();
    }
    
    // 更新压力指示器
    function updatePressureIndicator() {
        // 根据剩余步数和游戏时间计算压力值
        // 压力从0（最低）到100（最高）
        const stepsPercentage = (60 - steps) / 60 * 100;
        const timePercentage = Math.min(time / 300 * 100, 100);
        const pressureValue = (stepsPercentage * 0.7) + (timePercentage * 0.3);
        
        // 更新压力指示器宽度
        pressureIndicator.style.width = `${pressureValue}%`;
        
        // 根据压力值改变颜色
        if (pressureValue < 30) {
            pressureIndicator.style.background = 'linear-gradient(to right, #4d77ff, #82c3ec)';
        } else if (pressureValue < 70) {
            pressureIndicator.style.background = 'linear-gradient(to right, #f24c4c, #e94560)';
        } else {
            pressureIndicator.style.background = 'linear-gradient(to right, #ff2e63, #e03131)';
            pressureIndicator.style.boxShadow = '0 0 15px rgba(224, 49, 49, 0.8)';
        }
    }
    
    // 添加随机方块
    function addRandomTile() {
        // 播放新方块音效
        AUDIO.newTile.play();
        // 找出所有空格子
        const emptyCells = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        // 如果没有空格子，则返回
        if (emptyCells.length === 0) return false;
        
        // 随机选择一个空格子
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        
        // 确定生成的数字
        let value;
        const rand = Math.random();
        const maxTileValue = getMaxTileValue();
        
        if (maxTileValue >= 32 && rand < 0.15) {
            // 15%概率生成当前最大数字的一半
            value = maxTileValue / 2;
        } else if (rand < 0.5) {
            value = 2; // 50%概率生成2
        } else if (rand < 0.8) {
            value = 4; // 30%概率生成4
        } else if (rand < 0.95) {
            value = 8; // 15%概率生成8
        } else {
            value = 16; // 5%概率生成16
        }
        
        // 更新网格并创建方块
        grid[randomCell.row][randomCell.col] = value;
        createTileElement(randomCell.row, randomCell.col, value);
        
        return true;
    }
    
    // 获取当前最大方块值
    function getMaxTileValue() {
        let max = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                max = Math.max(max, grid[row][col]);
            }
        }
        return max;
    }
    
    // 创建方块DOM元素
    function createTileElement(row, col, value) {
        const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        tile.dataset.value = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        
        // 添加点击事件监听器
        tile.addEventListener('click', handleTileClick);
        
        // 超过2048的方块使用特殊样式
        if (value > 2048) {
            tile.classList.add('tile-super');
        }
        
        cell.appendChild(tile);
    }
    
    // 处理方块点击事件
    function handleTileClick(event) {
        if (!gameActive) return;
        
        const clickedTile = event.target;
        const value = parseInt(clickedTile.dataset.value);
        const row = parseInt(clickedTile.dataset.row);
        const col = parseInt(clickedTile.dataset.col);
        
        // 如果没有选中的方块，则选中当前方块
        if (selectedTile === null) {
            selectedTile = { element: clickedTile, value, row, col };
            clickedTile.classList.add('selected');
            // 播放选择音效
            AUDIO.select.play();
            
            // 添加涟漪效果
            addRippleEffect(row, col);
        } 
        // 如果点击的是已选中的方块，则取消选中
        else if (selectedTile.element === clickedTile) {
            selectedTile.element.classList.remove('selected');
            selectedTile = null;
            // 播放选择音效
            AUDIO.select.play();
        } 
        // 如果点击的方块与选中的方块数值相同，则合并
        else if (selectedTile.value === value) {
            // 合并方块
            mergeTiles(selectedTile.row, selectedTile.col, row, col);
            
            // 减少步数
            steps--;
            
            // 检查是否有可合并的方块
            if (!hasMergableTiles() && steps > 0) {
                addTwoRandomTiles();
            }
            
            // 更新显示
            updateDisplay();
            
            // 检查游戏是否结束
            checkGameOver();
        } 
        // 如果点击的方块与选中的方块数值不同，则选中新方块
        else {
            selectedTile.element.classList.remove('selected');
            selectedTile = { element: clickedTile, value, row, col };
            clickedTile.classList.add('selected');
            // 播放选择音效
            AUDIO.select.play();
            
            // 添加涟漪效果
            addRippleEffect(row, col);
        }
    }
    
    // 添加涟漪效果
    function addRippleEffect(row, col) {
        const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        cell.style.animation = 'none';
        cell.offsetHeight; // 触发重绘
        cell.style.animation = 'ripple 1s';
        
        setTimeout(() => {
            cell.style.animation = 'none';
        }, 1000);
    }
    
    // 合并方块
    function mergeTiles(fromRow, fromCol, toRow, toCol) {
        // 获取合并后的值
        const mergedValue = grid[fromRow][fromCol] * 2;
        
        // 更新分数
        score += mergedValue;
        
        // 更新网格
        grid[fromRow][fromCol] = 0;
        grid[toRow][toCol] = mergedValue;
        
        // 移除原方块
        const fromCell = document.querySelector(`.grid-cell[data-row="${fromRow}"][data-col="${fromCol}"]`);
        const toCell = document.querySelector(`.grid-cell[data-row="${toRow}"][data-col="${toCol}"]`);
        fromCell.innerHTML = '';
        toCell.innerHTML = '';
        
        // 创建新方块
        createTileElement(toRow, toCol, mergedValue);
        
        // 播放合并音效
        AUDIO.merge.play();
        
        // 如果合并得到的是较高数值的方块，播放特殊音效
        if (mergedValue >= 128 && mergedValue > lastHighTile) {
            setTimeout(() => {
                AUDIO.success.play();
            }, 200);
            lastHighTile = mergedValue;
        }
        
        // 添加震动效果
        const gridContainer = document.querySelector('.grid-container');
        gridContainer.style.animation = 'none';
        gridContainer.offsetHeight; // 触发重绘
        gridContainer.style.animation = mergedValue >= 128 ? 'shake 0.3s' : 'none';
        
        // 生成一个新的随机方块
        addRandomTile();
        
        // 清除选中状态
        selectedTile = null;
        
        // 检查是否达到2048
        if (mergedValue >= 2048) {
            gameWin();
        }
    }
    
    // 检查是否有可合并的方块
    function hasMergableTiles() {
        // 创建值的映射表
        const valueMap = {};
        
        // 收集所有非零方块的值
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = grid[row][col];
                if (value !== 0) {
                    if (!valueMap[value]) {
                        valueMap[value] = [];
                    }
                    valueMap[value].push({ row, col });
                }
            }
        }
        
        // 检查每个值是否有多个实例（可合并）
        for (const value in valueMap) {
            if (valueMap[value].length >= 2) {
                return true;
            }
        }
        
        return false;
    }
    
    // 添加两个随机方块
    function addTwoRandomTiles() {
        // 添加第一个随机方块
        const added1 = addRandomTile();
        
        // 添加第二个随机方块
        const added2 = addRandomTile();
        
        // 如果没有空格子可添加，返回false
        return added1 && added2;
    }
    
    // 检查游戏是否结束
    function checkGameOver() {
        // 如果步数用完，游戏结束
        if (steps <= 0) {
            gameLose('步数用完');
            return;
        }
        
        // 检查是否有空格子
        let hasEmptyCell = false;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    hasEmptyCell = true;
                    break;
                }
            }
            if (hasEmptyCell) break;
        }
        
        // 如果没有空格子且没有可合并的方块，游戏结束
        if (!hasEmptyCell && !hasMergableTiles()) {
            gameLose('无法移动');
        }
    }
    
    // 游戏胜利
    function gameWin() {
        gameActive = false;
        stopTimer();
        showGameOverModal('胜利！', true);
        saveToLeaderboard();
        
        // 播放胜利音效
        AUDIO.success.play();
        
        // 创建烟花效果
        createFireworks(20, true);
    }
    
    // 游戏失败
    function gameLose(reason) {
        gameActive = false;
        stopTimer();
        showGameOverModal(`游戏结束 - ${reason}`, false);
        saveToLeaderboard();
        
        // 播放失败音效
        AUDIO.gameOver.play();
        
        // 创建一些暗淡的烟花效果
        createFireworks(5, false);
    }
    
    // 创建烟花效果
    function createFireworks(count, isWin) {
        const container = document.getElementById('fireworks-container');
        container.innerHTML = '';
        
        const colors = isWin ? 
            ['#ff2e63', '#e94560', '#4d77ff', '#00c2d1', '#82c3ec'] : 
            ['#ff2e63', '#e94560', '#222831'];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                
                // 随机位置
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                
                // 随机颜色
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                firework.style.left = `${left}%`;
                firework.style.top = `${top}%`;
                firework.style.backgroundColor = color;
                firework.style.boxShadow = `0 0 8px 2px ${color}`;
                
                container.appendChild(firework);
                
                // 动画结束后移除元素
                setTimeout(() => {
                    firework.remove();
                }, 1000);
            }, Math.random() * 800);
        }
    }
    
    // 显示游戏结束模态框
    function showGameOverModal(message, isWin) {
        gameOverMessage.textContent = message;
        gameOverScore.textContent = `得分: ${score}`;
        
        // 格式化时间
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        gameOverTime.textContent = `用时: ${minutes}:${seconds}`;
        
        gameOverSteps.textContent = `剩余步数: ${steps}`;
        
        // 计算并显示评分
        const rating = calculateRating(score, steps, time);
        gameOverRating.textContent = `评分: ${rating}`;
        
        // 显示模态框
        gameOverModal.style.display = 'flex';
    }
    
    // 计算评分
    function calculateRating(score, stepsLeft, timeTaken) {
        // 分数 (60% 权重)
        const scoreRating = Math.min(100, Math.floor(score / 1000) * 10);
        const scoreComponent = scoreRating * 0.6;
        
        // 剩余步数 (30% 权重)
        const stepsRating = Math.min(100, stepsLeft * 3);
        const stepsComponent = stepsRating * 0.3;
        
        // 用时 (10% 权重)
        let timeRating = 100;
        if (timeTaken > 300) {
            timeRating = Math.max(0, 100 - Math.floor((timeTaken - 300) / 10));
        }
        const timeComponent = timeRating * 0.1;
        
        // 总评分
        return Math.round(scoreComponent + stepsComponent + timeComponent);
    }
    
    // 保存到排行榜
    function saveToLeaderboard() {
        // 计算评分
        const rating = calculateRating(score, steps, time);
        
        // 格式化时间
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        const timeString = `${minutes}:${seconds}`;
        
        // 创建新记录
        const newRecord = {
            score,
            time: timeString,
            timeSec: time,
            steps,
            rating,
            isCurrentGame: true
        };
        
        // 从localStorage获取排行榜数据
        let leaderboard = JSON.parse(localStorage.getItem('game2048_leaderboard') || '[]');
        
        // 移除之前可能存在的当前游戏标记
        leaderboard = leaderboard.map(record => {
            record.isCurrentGame = false;
            return record;
        });
        
        // 添加新记录
        leaderboard.push(newRecord);
        
        // 按评分排序
        leaderboard.sort((a, b) => b.rating - a.rating);
        
        // 只保留前10名
        if (leaderboard.length > 10) {
            leaderboard = leaderboard.slice(0, 10);
        }
        
        // 保存到localStorage
        localStorage.setItem('game2048_leaderboard', JSON.stringify(leaderboard));
        
        // 更新排行榜显示
        updateLeaderboard();
    }
    
    // CSS震动效果
    function addShakeEffect() {
        // 添加 CSS 震动效果样式
        if (!document.getElementById('shakeEffect')) {
            const style = document.createElement('style');
            style.id = 'shakeEffect';
            style.textContent = `
                @keyframes shake {
                    0% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    50% { transform: translateX(5px); }
                    75% { transform: translateX(-5px); }
                    100% { transform: translateX(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 更新排行榜显示
    function updateLeaderboard() {
        // 清空排行榜
        leaderboardBody.innerHTML = '';
        
        // 从localStorage获取排行榜数据
        const leaderboard = JSON.parse(localStorage.getItem('game2048_leaderboard') || '[]');
        
        // 没有数据时显示提示
        if (leaderboard.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 5;
            emptyCell.textContent = '暂无记录';
            emptyCell.style.textAlign = 'center';
            emptyRow.appendChild(emptyCell);
            leaderboardBody.appendChild(emptyRow);
            return;
        }
        
        // 添加每条记录
        leaderboard.forEach((record, index) => {
            const row = document.createElement('tr');
            
            // 如果是当前游戏，高亮显示
            if (record.isCurrentGame) {
                row.classList.add('current-game');
            }
            
            // 排名
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            row.appendChild(rankCell);
            
            // 分数
            const scoreCell = document.createElement('td');
            scoreCell.textContent = record.score;
            row.appendChild(scoreCell);
            
            // 用时
            const timeCell = document.createElement('td');
            timeCell.textContent = record.time;
            row.appendChild(timeCell);
            
            // 剩余步数
            const stepsCell = document.createElement('td');
            stepsCell.textContent = record.steps;
            row.appendChild(stepsCell);
            
            // 评分
            const ratingCell = document.createElement('td');
            ratingCell.textContent = record.rating;
            row.appendChild(ratingCell);
            
            leaderboardBody.appendChild(row);
        });
    }
    
    // 事件监听器
    
    // 重新开始按钮
    restartButton.addEventListener('click', () => {
        initGame();
    });
    
    // 模态框中的重新开始按钮
    restartButtonModal.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        initGame();
    });
    
    // 初始加载
    
    // 添加震动效果CSS
    addShakeEffect();
    
    // 更新排行榜
    updateLeaderboard();
    
    // 开始游戏
    initGame();
    
    // 预加载音效
    Object.values(AUDIO).forEach(audio => {
        audio.load();
    });
});
