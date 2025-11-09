// ========== Firebase 配置和初始化 ==========
const firebaseConfig = {
  apiKey: "AIzaSyB-d1mmApzVVLogJe5j1LH8AyizsELsYKk",
  authDomain: "dota-team-picker.firebaseapp.com",
  databaseURL: "https://dota-team-picker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dota-team-picker",
  storageBucket: "dota-team-picker.firebasestorage.app",
  messagingSenderId: "155275449613",
  appId: "1:155275449613:web:28984455ebd7ec3384cc44"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ========== 全局变量 ==========
let playerPool = [];
let myPlayer = null; // 我选择的玩家
let currentRoomId = null;
let currentUserId = null;
let roomRef = null;

const HERO_IMAGE_URL = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/';

// ========== 页面加载 ==========
window.addEventListener('DOMContentLoaded', function() {
    currentUserId = generateUserId();
    loadPlayerData();
});

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function loadPlayerData() {
    try {
        const response = await fetch('players/players.json');
        
        if (!response.ok) {
            throw new Error('无法加载玩家配置文件');
        }
        
        playerPool = await response.json();
        
        if (!Array.isArray(playerPool) || playerPool.length === 0) {
            throw new Error('玩家配置文件格式错误或为空');
        }
        
        document.getElementById('loadingArea').style.display = 'none';
        document.getElementById('selectMeArea').style.display = 'block';
        updatePlayerSelection();
        
    } catch (error) {
        console.error('加载失败:', error);
        showError('无法加载玩家数据，请检查 players/players.json 文件是否存在且格式正确。');
    }
}

function showError(message) {
    document.getElementById('loadingArea').style.display = 'none';
    document.getElementById('errorArea').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// ========== 工具函数 ==========
function getHeroImageUrl(heroId) {
    if (!heroId || heroId === '') {
        return 'https://via.placeholder.com/60x60/333333/ffffff?text=?';
    }
    return `${HERO_IMAGE_URL}${heroId}.png`;
}

function getHeroesHTML(heroes, size = 'normal') {
    const sizeClass = size === 'tiny' ? 'hero-icon-tiny' : 
                      size === 'small' ? 'hero-icon-small' : 'hero-icon';
    
    const heroList = heroes && heroes.length > 0 ? [...heroes] : [];
    while (heroList.length < 3) {
        heroList.push('');
    }
    
    return heroList.slice(0, 3).map(heroId => `
        <img class="${sizeClass}" 
             src="${getHeroImageUrl(heroId)}" 
             alt="${heroId || '未选择'}"
             onerror="this.src='https://via.placeholder.com/60x60/333333/ffffff?text=?'">
    `).join('');
}

// ========== 第1步：选择我的玩家 ==========
function updatePlayerSelection() {
    const selectionDiv = document.getElementById('playerSelection');
    
    selectionDiv.innerHTML = playerPool.map(player => {
        const isSelected = myPlayer && myPlayer.name === player.name;
        return `
            <div class="player-card ${isSelected ? 'selected' : ''}" 
                 onclick='selectMyPlayer(${JSON.stringify(player).replace(/'/g, "&#39;")})'>
                <div class="avatar-section">
                    <img class="avatar" 
                         src="players/${player.avatar}" 
                         alt="${player.name}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=667eea&color=fff&size=80'">
                    <div class="name">${player.name}</div>
                    <span class="position">${player.position}</span>
                </div>
                <div class="heroes-section">
                    <div class="heroes-label">偏好英雄</div>
                    <div class="heroes">
                        ${getHeroesHTML(player.heroes)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectMyPlayer(player) {
    myPlayer = player;
    
    // 显示我的玩家卡片
    document.getElementById('myPlayerCard').innerHTML = `
        <img class="avatar" 
             src="players/${player.avatar}" 
             alt="${player.name}"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=26de81&color=fff&size=100'">
        <div class="name">${player.name}</div>
        <span class="position">${player.position}</span>
        <div class="heroes">
            ${getHeroesHTML(player.heroes)}
        </div>
    `;
    
    // 切换到房间设置
    document.getElementById('selectMeArea').style.display = 'none';
    document.getElementById('roomSetupArea').style.display = 'block';
}

function backToSelectMe() {
    myPlayer = null;
    document.getElementById('roomSetupArea').style.display = 'none';
    document.getElementById('selectMeArea').style.display = 'block';
    updatePlayerSelection();
}

// ========== 第2步：房间管理 ==========
async function createRoom() {
    if (!myPlayer) {
        alert('请先选择你的玩家');
        return;
    }
    
    currentRoomId = generateRoomId();
    
    const roomData = {
        roomId: currentRoomId,
        participants: {
            [currentUserId]: {
                userId: currentUserId,
                player: myPlayer,
                joinedAt: Date.now()
            }
        },
        status: 'waiting',
        createdAt: Date.now()
    };
    
    try {
        await database.ref('rooms/' + currentRoomId).set(roomData);
        joinRoomListener(currentRoomId);
        
        document.getElementById('roomSetupArea').style.display = 'none';
        document.getElementById('waitingArea').style.display = 'block';
        document.getElementById('currentRoomId').textContent = currentRoomId;
    } catch (error) {
        alert('创建房间失败：' + error.message);
    }
}

async function joinRoom() {
    if (!myPlayer) {
        alert('请先选择你的玩家');
        return;
    }
    
    const roomId = document.getElementById('roomIdInput').value.toUpperCase().trim();
    
    if (!roomId || roomId.length !== 6) {
        alert('请输入正确的6位房间ID');
        return;
    }
    
    try {
        const snapshot = await database.ref('rooms/' + roomId).once('value');
        const roomData = snapshot.val();
        
        if (!roomData) {
            alert('房间不存在');
            return;
        }
        
        // 检查该玩家是否已被占用
        const participants = roomData.participants || {};
        const isPlayerTaken = Object.values(participants).some(p => p.player.name === myPlayer.name);
        
        if (isPlayerTaken) {
            alert('该玩家已被其他用户选择，请重新选择玩家');
            backToSelectMe();
            return;
        }
        
        // 检查房间是否已满
        if (Object.keys(participants).length >= 10) {
            alert('房间已满（10/10）');
            return;
        }
        
        currentRoomId = roomId;
        
        await database.ref('rooms/' + roomId + '/participants/' + currentUserId).set({
            userId: currentUserId,
            player: myPlayer,
            joinedAt: Date.now()
        });
        
        joinRoomListener(roomId);
        
        document.getElementById('roomSetupArea').style.display = 'none';
        document.getElementById('waitingArea').style.display = 'block';
        document.getElementById('currentRoomId').textContent = roomId;
    } catch (error) {
        alert('加入房间失败：' + error.message);
    }
}

function joinRoomListener(roomId) {
    roomRef = database.ref('rooms/' + roomId);
    
    roomRef.on('value', (snapshot) => {
        const roomData = snapshot.val();
        if (!roomData) return;
        
        updateRoomDisplay(roomData);
    });
}

function updateRoomDisplay(roomData) {
    const status = roomData.status;
    const participants = roomData.participants || {};
    
    const participantCount = Object.keys(participants).length;
    document.getElementById('participantCount').textContent = participantCount;
    
    // 显示参与者卡片
    const participantsList = document.getElementById('participantsList');
    participantsList.innerHTML = Object.values(participants).map(p => `
        <div class="participant-card">
            <img class="avatar" 
                 src="players/${p.player.avatar}" 
                 alt="${p.player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.player.name)}&background=26de81&color=fff&size=60'">
            <div class="name">${p.player.name}</div>
            <div class="position">${p.player.position}</div>
        </div>
    `).join('');
    
    // 根据状态切换页面
    if (status === 'waiting') {
        document.getElementById('waitingArea').style.display = 'block';
        document.getElementById('rollArea').style.display = 'none';
        document.getElementById('captainChoiceArea').style.display = 'none';
        document.getElementById('orderChoiceArea').style.display = 'none';
        document.getElementById('draftArea').style.display = 'none';
        
        document.getElementById('startRollBtn').disabled = participantCount !== 10;
    } else if (status === 'rolling') {
        document.getElementById('waitingArea').style.display = 'none';
        document.getElementById('rollArea').style.display = 'block';
        updateRollDisplay(roomData);
    } else if (status === 'captain_choice') {
        document.getElementById('rollArea').style.display = 'none';
        document.getElementById('captainChoiceArea').style.display = 'block';
        updateCaptainChoiceDisplay(roomData);
    } else if (status === 'order_choice') {
        document.getElementById('captainChoiceArea').style.display = 'none';
        document.getElementById('orderChoiceArea').style.display = 'block';
        updateOrderChoiceDisplay(roomData);
    } else if (status === 'drafting') {
        document.getElementById('orderChoiceArea').style.display = 'none';
        document.getElementById('draftArea').style.display = 'block';
        updateDraftDisplay(roomData);
    }
}

function copyRoomId() {
    const roomId = document.getElementById('currentRoomId').textContent;
    navigator.clipboard.writeText(roomId).then(() => {
        alert('房间ID已复制：' + roomId);
    });
}

function leaveRoom() {
    if (confirm('确定要离开房间吗？')) {
        if (roomRef) {
            database.ref('rooms/' + currentRoomId + '/participants/' + currentUserId).remove();
            roomRef.off();
        }
        
        currentRoomId = null;
        
        document.getElementById('waitingArea').style.display = 'none';
        document.getElementById('roomSetupArea').style.display = 'block';
    }
}

// ========== 第3步：Roll 点选队长 ==========
async function startRoll() {
    if (!currentRoomId) return;
    
    try {
        await database.ref('rooms/' + currentRoomId).update({
            status: 'rolling',
            rolls: {}
        });
    } catch (error) {
        alert('开始 Roll 点失败：' + error.message);
    }
}

async function rollDice() {
    if (!currentRoomId || !myPlayer) return;
    
    const rollValue = Math.floor(Math.random() * 101);
    
    try {
        await database.ref('rooms/' + currentRoomId + '/rolls/' + myPlayer.name).set({
            playerName: myPlayer.name,
            player: myPlayer,
            value: rollValue,
            rolledAt: Date.now()
        });
        
        document.getElementById('rollBtn').disabled = true;
        document.getElementById('myRoll').textContent = rollValue.toString().padStart(3, '0');
    } catch (error) {
        alert('Roll 点失败：' + error.message);
    }
}

function updateRollDisplay(roomData) {
    const rolls = roomData.rolls || {};
    const rollArray = Object.values(rolls);
    
    const myRoll = rolls[myPlayer.name];
    if (myRoll) {
        document.getElementById('myRoll').textContent = myRoll.value.toString().padStart(3, '0');
        document.getElementById('rollBtn').disabled = true;
    } else {
        document.getElementById('myRoll').textContent = '等待 Roll 点...';
        document.getElementById('rollBtn').disabled = false;
    }
    
    rollArray.sort((a, b) => b.value - a.value);
    
    const rollList = document.getElementById('rollResultsList');
    rollList.innerHTML = rollArray.map((roll, index) => {
        const isCaptain = index < 2;
        return `
            <div class="roll-item ${isCaptain ? 'captain' : ''}">
                <span class="player-name">${roll.playerName}</span>
                <span class="roll-value">${roll.value.toString().padStart(3, '0')}</span>
            </div>
        `;
    }).join('');
    
    if (rollArray.length === 10 && !roomData.captains) {
        setTimeout(() => {
            selectCaptains(rollArray);
        }, 2000);
    }
    
    if (roomData.captains) {
        document.getElementById('captainsAnnouncement').style.display = 'block';
        document.getElementById('captainsDisplay').innerHTML = `
            👑 队长1：<strong>${roomData.captains.captain1.name}</strong> (Roll: ${roomData.captains.captain1.roll})<br>
            👑 队长2：<strong>${roomData.captains.captain2.name}</strong> (Roll: ${roomData.captains.captain2.roll})
        `;
    }
}

async function selectCaptains(rollArray) {
    if (!currentRoomId) return;
    
    const captain1 = rollArray[0];
    const captain2 = rollArray[1];
    
    try {
        await database.ref('rooms/' + currentRoomId).update({
            status: 'captain_choice',
            captains: {
                captain1: {
                    name: captain1.playerName,
                    roll: captain1.value,
                    player: captain1.player
                },
                captain2: {
                    name: captain2.playerName,
                    roll: captain2.value,
                    player: captain2.player
                }
            }
        });
    } catch (error) {
        console.error('选择队长失败：', error);
    }
}

// ========== 第4步：队长选择优先权 ==========
function updateCaptainChoiceDisplay(roomData) {
    const captains = roomData.captains;
    if (!captains) return;
    
    document.getElementById('firstCaptainName').textContent = captains.captain1.name;
    document.getElementById('firstCaptainRoll').textContent = captains.captain1.roll;
    
    const isFirstCaptain = myPlayer.name === captains.captain1.name;
    document.getElementById('choiceOrderBtn').disabled = !isFirstCaptain;
    document.getElementById('choiceSideBtn').disabled = !isFirstCaptain;
    
    if (roomData.captainChoice) {
        const choice = roomData.captainChoice;
        document.getElementById('captainChoiceResult').style.display = 'block';
        document.getElementById('captainChoiceResult').innerHTML = `
            ✅ ${captains.captain1.name} 选择了：<strong>${choice === 'order' ? '决定选人顺序' : '决定队伍阵营'}</strong>
        `;
    }
}

async function captainChoose(choice) {
    if (!currentRoomId) return;
    
    try {
        await database.ref('rooms/' + currentRoomId).update({
            captainChoice: choice
        });
        
        if (choice === 'side') {
            const side = confirm('选择阵营：\n确定 = 天辉（蓝队）\n取消 = 夜魇（红队）');
            
            await database.ref('rooms/' + currentRoomId).update({
                status: 'order_choice',
                sideChoice: side ? 'radiant' : 'dire'
            });
        } else {
            await database.ref('rooms/' + currentRoomId).update({
                status: 'order_choice'
            });
        }
    } catch (error) {
        alert('选择失败：' + error.message);
    }
}

// ========== 第5步：选择先后手 ==========
function updateOrderChoiceDisplay(roomData) {
    const captains = roomData.captains;
    const captainChoice = roomData.captainChoice;
    
    let orderChooser;
    if (captainChoice === 'order') {
        orderChooser = captains.captain1.name;
    } else {
        orderChooser = captains.captain2.name;
    }
    
    document.getElementById('orderCaptainName').textContent = orderChooser;
    
    const canChoose = myPlayer.name === orderChooser;
    document.getElementById('firstPickBtn').disabled = !canChoose;
    document.getElementById('secondPickBtn').disabled = !canChoose;
}

async function chooseOrder(order) {
    if (!currentRoomId) return;
    
    const roomData = (await database.ref('rooms/' + currentRoomId).once('value')).val();
    const captains = roomData.captains;
    const captainChoice = roomData.captainChoice;
    const sideChoice = roomData.sideChoice;
    const participants = roomData.participants;
    
    // 获取所有10名玩家
    const allPlayers = Object.values(participants).map(p => p.player);
    
    let team1Captain, team2Captain, pickOrder;
    
    if (captainChoice === 'order') {
        if (order === 'first') {
            team1Captain = captains.captain1;
            team2Captain = captains.captain2;
            pickOrder = [1, 2, 2, 1, 1, 2, 2, 1];
        } else {
            team1Captain = captains.captain2;
            team2Captain = captains.captain1;
            pickOrder = [2, 1, 1, 2, 2, 1, 1, 2];
        }
    } else {
        if (sideChoice === 'radiant') {
            team1Captain = captains.captain1;
            team2Captain = captains.captain2;
        } else {
            team1Captain = captains.captain2;
            team2Captain = captains.captain1;
        }
        
        if (order === 'first') {
            pickOrder = [2, 1, 1, 2, 2, 1, 1, 2];
        } else {
            pickOrder = [1, 2, 2, 1, 1, 2, 2, 1];
        }
    }
    
    const availablePlayers = allPlayers.filter(
        p => p.name !== team1Captain.name && p.name !== team2Captain.name
    );
    
    try {
        await database.ref('rooms/' + currentRoomId).update({
            status: 'drafting',
            team1: {
                captain: team1Captain,
                players: [team1Captain.player]
            },
            team2: {
                captain: team2Captain,
                players: [team2Captain.player]
            },
            availablePlayers: availablePlayers,
            pickOrder: pickOrder,
            currentPickIndex: 0
        });
    } catch (error) {
        alert('开始选人失败：' + error.message);
    }
}

// ========== 第6步：选人 ==========
function updateDraftDisplay(roomData) {
    const team1 = roomData.team1 || { players: [] };
    const team2 = roomData.team2 || { players: [] };
    const availablePlayers = roomData.availablePlayers || [];
    const pickOrder = roomData.pickOrder || [];
    const currentPickIndex = roomData.currentPickIndex || 0;
    
    document.getElementById('team1Title').textContent = `🔵 ${team1.captain.name} 的队伍`;
    document.getElementById('team2Title').textContent = `🔴 ${team2.captain.name} 的队伍`;
    
    document.getElementById('team1Players').innerHTML = team1.players.map((player, index) => `
        <div class="team-player">
            <img class="avatar-small" 
                 src="players/${player.avatar}" 
                 alt="${player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=2196F3&color=fff&size=45'">
            <div class="player-info">
                <div class="player-name">${player.name}${index === 0 ? ' 👑' : ''}</div>
                <div class="player-position">${player.position}</div>
            </div>
            <div class="heroes-small">
                ${getHeroesHTML(player.heroes, 'small')}
            </div>
        </div>
    `).join('');
    
    document.getElementById('team2Players').innerHTML = team2.players.map((player, index) => `
        <div class="team-player">
            <img class="avatar-small" 
                 src="players/${player.avatar}" 
                 alt="${player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=f44336&color=fff&size=45'">
            <div class="player-info">
                <div class="player-name">${player.name}${index === 0 ? ' 👑' : ''}</div>
                <div class="player-position">${player.position}</div>
            </div>
            <div class="heroes-small">
                ${getHeroesHTML(player.heroes, 'small')}
            </div>
        </div>
    `).join('');
    
    if (currentPickIndex >= pickOrder.length) {
        document.getElementById('currentTurn').innerHTML = '✅ 选人完成！';
        document.getElementById('availablePlayers').innerHTML = '';
        return;
    }
    
    const currentTeam = pickOrder[currentPickIndex];
    const currentCaptain = currentTeam === 1 ? team1.captain : team2.captain;
    const teamName = currentTeam === 1 ? '🔵 ' + team1.captain.name : '🔴 ' + team2.captain.name;
    
    document.getElementById('currentTurn').innerHTML = 
        `当前回合：${teamName} - 队长 <strong>${currentCaptain.name}</strong> 请选择队员`;
    
    const canPick = myPlayer.name === currentCaptain.name;
    const playersDiv = document.getElementById('availablePlayers');
    playersDiv.innerHTML = availablePlayers.map(player => `
        <div class="available-player ${canPick ? '' : 'disabled'}" 
             onclick='${canPick ? `pickPlayer(${JSON.stringify(player).replace(/'/g, "&#39;")})` : ''}'>
            <img class="avatar-medium" 
                 src="players/${player.avatar}" 
                 alt="${player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=667eea&color=fff&size=70'">
            <div class="name">${player.name}</div>
            <span class="position-tag">${player.position}</span>
            <div class="heroes-row">
                ${getHeroesHTML(player.heroes, 'tiny')}
            </div>
        </div>
    `).join('');
}

async function pickPlayer(player) {
    if (!currentRoomId) return;
    
    const roomData = (await database.ref('rooms/' + currentRoomId).once('value')).val();
    const pickOrder = roomData.pickOrder;
    const currentPickIndex = roomData.currentPickIndex;
    const currentTeam = pickOrder[currentPickIndex];
    
    const teamKey = currentTeam === 1 ? 'team1' : 'team2';
    const team = roomData[teamKey];
    team.players.push(player);
    
    const availablePlayers = roomData.availablePlayers.filter(p => p.name !== player.name);
    
    try {
        await database.ref('rooms/' + currentRoomId).update({
            [teamKey]: team,
            availablePlayers: availablePlayers,
            currentPickIndex: currentPickIndex + 1
        });
    } catch (error) {
        alert('选择玩家失败：' + error.message);
    }
}