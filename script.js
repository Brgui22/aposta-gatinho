document.addEventListener('DOMContentLoaded', () => {

    // Selecionando os elementos do HTML
    const walletAmountEl = document.getElementById('wallet-amount');
    const startGameButton = document.getElementById('start-game-button');
    const betAmountInput = document.getElementById('bet-amount');
    const cups = document.querySelectorAll('.cup-container');
    const messageArea = document.querySelector('#message-area p');
    const timerEl = document.getElementById('timer');
    const betPresets = document.getElementById('bet-presets');
    const historyList = document.getElementById('history-list');

    // Variáveis de estado do jogo
    let wallet = 100;
    let currentBet = 0;
    let hasBetForCurrentRound = false;
    let canChoose = false;
    let winningCup = null;
    let gameHistory = []; // Array para guardar o histórico

    // Função para atualizar a carteira na tela
    function updateWallet() {
        walletAmountEl.textContent = `R$ ${wallet.toFixed(2)}`;
    }

    // Função para mostrar mensagens ao jogador
    function showMessage(msg) {
        messageArea.textContent = msg;
    }

    // Lógica para os botões de aposta rápida
    betPresets.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        const action = e.target.dataset.action;
        const value = parseInt(e.target.dataset.value);
        let currentInputValue = parseInt(betAmountInput.value) || 0;

        if (action === 'max') {
            betAmountInput.value = Math.floor(wallet);
        } else if (action === 'half') {
            betAmountInput.value = Math.floor(wallet / 2);
        } else if (value) {
            let newValue = currentInputValue + value;
            if (newValue > wallet) { // Impede que o valor vá além do saldo
                newValue = wallet;
            }
            betAmountInput.value = newValue;
        }

        // Garante que o valor não seja maior que a carteira
        if (parseInt(betAmountInput.value) > wallet) {
            betAmountInput.value = wallet;
        }
    });
    
    // Botão de aposta principal
    startGameButton.addEventListener('click', () => {
        if (hasBetForCurrentRound) return;

        const bet = parseInt(betAmountInput.value);

        if (isNaN(bet) || bet <= 0) {
            showMessage("Insira um valor de aposta válido.");
            return;
        }
        if (bet > wallet) {
            showMessage("Você não tem saldo suficiente.");
            // O botão MAX/HALF já deveria impedir isso, mas é uma validação extra
            betAmountInput.value = wallet; // Ajusta para o máximo
            return;
        }

        hasBetForCurrentRound = true;
        currentBet = bet;
        wallet -= currentBet;
        updateWallet();
        
        startGameButton.disabled = true;
        betAmountInput.disabled = true;
        betPresets.querySelectorAll('button').forEach(btn => btn.disabled = true); // Desabilita presets
        
        showMessage("Aposta feita! Observe onde a bola de lã vai aparecer...");
    });

    // Lógica para a escolha do copo
    cups.forEach(cup => {
        cup.addEventListener('click', () => {
            if (!canChoose) return;
            canChoose = false;

            const playerChoice = parseInt(cup.dataset.cup);
            cup.classList.add('selected');

            showMessage("Vamos ver se você acertou...");

            setTimeout(() => {
                let outcome, amount;

                cups.forEach(c => {
                    c.classList.add('lifted');
                    if (parseInt(c.dataset.cup) === winningCup) {
                        c.classList.add('show-cat');
                    }
                });

                if (playerChoice === winningCup) {
                    const winnings = currentBet * 2;
                    wallet += winnings;
                    showMessage(`Parabéns! Você ganhou R$ ${winnings.toFixed(2)}!`);
                    outcome = 'win';
                    amount = winnings;
                } else {
                    showMessage("Que pena, não foi dessa vez!");
                    outcome = 'loss';
                    amount = currentBet;
                }
                
                updateWallet();
                updateHistory(outcome, amount); // Atualiza o histórico com o resultado real
                setTimeout(prepareForNewRound, 4000);
            }, 1000);
        });
    });

    // Função que gerencia o timer e as rodadas
    function manageRoundTimer() {
        let timeLeft = 10;
        timerEl.textContent = `${timeLeft}s`;

        const timerInterval = setInterval(() => {
            timeLeft--;
            timerEl.textContent = `${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                startShuffleSequence();
            }
        }, 1000);
    }
    
    // Inicia a sequência de mostrar, esconder e embaralhar
    async function startShuffleSequence() {
        if (!hasBetForCurrentRound) {
            showMessage("Tempo esgotado! Faça uma aposta para a próxima rodada.");
            prepareForNewRound();
            return;
        }

        winningCup = Math.floor(Math.random() * 3) + 1;
        const winningCupEl = document.querySelector(`.cup-container[data-cup="${winningCup}"]`);
        
        showMessage("Olhe rápido!");
        winningCupEl.classList.add('lifted', 'show-cat');

        setTimeout(async () => {
            winningCupEl.classList.remove('lifted', 'show-cat');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            showMessage("Embaralhando...");
            await shuffleCups(4, 400);

            showMessage("Onde está a bola de lã? Escolha um copo!");
            canChoose = true;
        }, 1500);
    }

    // Função de embaralhamento rápido
    async function shuffleCups(times, duration) {
        const cupElements = Array.from(cups);
        
        for (let i = 0; i < times; i++) {
            // Troca a posição de dois copos aleatórios
            const [cupA, cupB] = cupElements.sort(() => 0.5 - Math.random()).slice(0, 2);

            const posA = cupA.getBoundingClientRect();
            const posB = cupB.getBoundingClientRect();

            const transformA = `translateX(${posB.left - posA.left}px)`;
            const transformB = `translateX(${posA.left - posB.left}px)`;

            cupA.style.transform = transformA;
            cupB.style.transform = transformB;

            await new Promise(resolve => setTimeout(resolve, duration));

            // Para que o shuffle visual seja convincente, trocamos os elementos no DOM
            // Isso garante que a posição lógica (data-cup) esteja de acordo com a visual após o shuffle
            const parent = cupA.parentNode;
            if (parent && cupB.nextSibling) {
                parent.insertBefore(cupA, cupB.nextSibling);
            } else if (parent) {
                parent.appendChild(cupA); // Se cupB for o último, move A para o final
            }
            
            // É crucial resetar o transform para que as posições relativas funcionem corretamente no próximo passo
            cupA.style.transform = '';
            cupB.style.transform = '';

            // Re-obtém os elementos para a próxima iteração, caso a ordem no DOM tenha mudado
            // (Não é estritamente necessário se apenas trocamos A e B, mas boa prática)
            // cupElements = Array.from(cups); 
        }
    }

    // Função para ATUALIZAR E MOSTRAR o histórico
    function updateHistory(outcome, amount) {
        gameHistory.push({ outcome, amount });

        // Limita o histórico aos últimos 5 itens visíveis
        if (gameHistory.length > 5) {
            gameHistory.shift();
        }

        renderHistory();
    }

    // Renderiza o histórico (pode ser chamado no início e após cada partida)
    function renderHistory() {
        historyList.innerHTML = '';
        gameHistory.forEach(item => {
            const li = document.createElement('li');
            li.className = `history-item ${item.outcome}`;
            
            const outcomeText = item.outcome === 'win' ? 'Vitória' : 'Derrota';
            const sign = item.outcome === 'win' ? '+' : '-';

            li.innerHTML = `
                <span>${outcomeText}</span>
                <span>${sign}R$ ${item.amount.toFixed(2)}</span>
            `;
            historyList.appendChild(li);
        });
    }

    // Gera dados de histórico de mock no início
    function generateMockHistory() {
        const outcomes = ['win', 'loss'];
        const amounts = [10, 25, 50, 75, 100];
        
        for (let i = 0; i < 5; i++) {
            const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
            gameHistory.push({ outcome: randomOutcome, amount: randomAmount });
        }
        renderHistory();
    }


    // Prepara o jogo para a próxima rodada
    function prepareForNewRound() {
        cups.forEach(cup => {
            cup.classList.remove('selected', 'lifted', 'show-cat');
        });
        
        hasBetForCurrentRound = false;
        winningCup = null;
        canChoose = false;
        
        startGameButton.disabled = false;
        betAmountInput.disabled = false;
        betPresets.querySelectorAll('button').forEach(btn => btn.disabled = false); // Habilita presets
        betAmountInput.value = '';
        
        showMessage("Faça sua aposta para a próxima rodada!");
        manageRoundTimer();
    }

    // Inicializa o jogo
    updateWallet();
    generateMockHistory(); // Gera e mostra o histórico mock no carregamento
    manageRoundTimer();
});