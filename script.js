document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const menuItems = document.querySelectorAll('.menu-item');
    const orderSummaryDiv = document.getElementById('order-summary');
    const totalPriceDiv = document.getElementById('total-price');
    const whatsappButton = document.getElementById('whatsapp-button');
    const clientNameInput = document.getElementById('client-name-input');
    const scheduleCheckbox = document.getElementById('schedule-checkbox');
    const scheduleFieldsDiv = document.getElementById('schedule-fields');
    const scheduleDateInput = document.getElementById('schedule-date');
    const scheduleTimeInput = document.getElementById('schedule-time');

    // Seletores de Erro
    const nameError = document.getElementById('name-error');
    const scheduleError = document.getElementById('schedule-error');
    const whatsappError = document.getElementById('whatsapp-error'); // Erro de pedido vazio

    // --- Configuração ---
    const restauranteWhatsAppNumber = '5519971314811'; // <<<< COLOQUE AQUI O NÚMERO DO WHATSAPP DO RESTAURANTE (Formato: 55 + DDD + Número)

    // --- Estado do Pedido ---
    let currentOrder = {}; // { itemId: { name, price, quantity, observations }, ... }

    // --- Funções Auxiliares ---

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Formata data YYYY-MM-DD para DD/MM/YYYY
    function formatDateForDisplay(isoDate) {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    }

     // Define a data mínima para hoje no input date
     function setMinDate() {
        const today = new Date();
        // Formata para YYYY-MM-DD exigido pelo input type="date"
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        scheduleDateInput.min = `${year}-${month}-${day}`;
    }


    function updateOrderSummary() {
        orderSummaryDiv.innerHTML = '';
        let hasItems = false;
        const sortedItemIds = Object.keys(currentOrder).sort((a, b) => currentOrder[a].name.localeCompare(currentOrder[b].name));

        sortedItemIds.forEach(itemId => {
            const item = currentOrder[itemId];
            if (item.quantity > 0) {
                hasItems = true;
                const itemElement = document.createElement('div');
                itemElement.classList.add('summary-item');

                let itemText = `<strong>${item.quantity}x ${item.name}</strong>`;
                if (item.observations) {
                    itemText += ` <span style="font-style: italic; color: #555;">(Obs: ${item.observations})</span>`;
                }
                itemText += ` - ${formatCurrency(item.price * item.quantity)}`;

                itemElement.innerHTML = itemText;
                orderSummaryDiv.appendChild(itemElement);
            }
        });

        if (!hasItems) {
            orderSummaryDiv.innerHTML = '<p>Selecione os itens acima para montar seu pedido.</p>';
        }
    }

    function updateTotalPrice() {
        let total = 0;
        for (const itemId in currentOrder) {
            total += currentOrder[itemId].price * currentOrder[itemId].quantity;
        }
        totalPriceDiv.textContent = `Total: ${formatCurrency(total)}`;
    }

    function handleItemChange(event) {
        const input = event.target;
        const menuItemElement = input.closest('.menu-item');
        if (!menuItemElement) return;

        const itemId = menuItemElement.dataset.itemId;
        const itemName = menuItemElement.dataset.itemName;
        const itemPrice = parseFloat(menuItemElement.dataset.itemPrice);
        const quantityInput = menuItemElement.querySelector('.quantity-input');
        const observationsInput = menuItemElement.querySelector('.observations-input');
        const quantity = parseInt(quantityInput.value) || 0;
        const observations = observationsInput.value.trim();

        if (quantity > 0) {
            currentOrder[itemId] = { name: itemName, price: itemPrice, quantity: quantity, observations: observations };
        } else {
            delete currentOrder[itemId];
            if (input === quantityInput) { observationsInput.value = ''; }
        }

        updateOrderSummary();
        updateTotalPrice();
        if (Object.keys(currentOrder).length > 0) { whatsappError.style.display = 'none'; }
    }

    function generateWhatsAppMessage() {
        const clientName = clientNameInput.value.trim();
        const isScheduled = scheduleCheckbox.checked;
        const scheduleDate = scheduleDateInput.value;
        const scheduleTime = scheduleTimeInput.value;

        // Validações básicas já foram feitas no handleWhatsAppClick, mas verificamos de novo
        if (Object.keys(currentOrder).length === 0 || !clientName) {
            console.error("Tentando gerar mensagem sem itens ou nome.");
            return null;
        }
        if (isScheduled && (!scheduleDate || !scheduleTime)) {
             console.error("Tentando gerar mensagem agendada sem data/hora.");
             return null;
        }

        let message = `Pedido de: *${clientName}* 👋\n\n`;

        // Adiciona informação de agendamento se houver
        if (isScheduled && scheduleDate && scheduleTime) {
            message += `*AGENDAMENTO:* ${formatDateForDisplay(scheduleDate)} às ${scheduleTime}\n\n`;
            message += `--------------------\n`; // Separador
        }

        message += `*Itens do Pedido:*\n`;
        let total = 0;
        const sortedItemIds = Object.keys(currentOrder).sort((a, b) => currentOrder[a].name.localeCompare(currentOrder[b].name));

        sortedItemIds.forEach(itemId => {
            const item = currentOrder[itemId];
            message += `*${item.quantity}x ${item.name}*`;
            if (item.observations) {
                message += `\n  📝 _Obs: ${item.observations}_`;
            }
            message += `\n`;
            total += item.price * item.quantity;
        });

        message += `\n*Total do Pedido: ${formatCurrency(total)}*\n\n`;
        message += `--------------------\n`;
        message += `(Pedido gerado via cardápio online ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})})`;

        return message;
    }

    function handleWhatsAppClick() {
        const clientName = clientNameInput.value.trim();
        const isScheduled = scheduleCheckbox.checked;
        const scheduleDate = scheduleDateInput.value;
        const scheduleTime = scheduleTimeInput.value;
        const currentTotalItems = Object.keys(currentOrder).length;

        // Limpa erros anteriores
        nameError.style.display = 'none';
        scheduleError.style.display = 'none';
        whatsappError.style.display = 'none';

        let hasError = false;
        let firstErrorField = null;

        // 1. Validar Nome
        if (!clientName) {
            nameError.style.display = 'block';
            hasError = true;
            firstErrorField = clientNameInput;
        }

        // 2. Validar Agendamento (se o checkbox estiver marcado)
        if (isScheduled) {
            if (!scheduleDate || !scheduleTime) {
                scheduleError.style.display = 'block';
                hasError = true;
                 if (!firstErrorField) firstErrorField = !scheduleDate ? scheduleDateInput : scheduleTimeInput;
            }
        }

        // 3. Validar Itens no Pedido
        if (currentTotalItems === 0) {
            whatsappError.style.display = 'block';
            hasError = true;
             // Não define como firstErrorField, o scroll será para a mensagem geral
        }

        // Se houver erro, foca no primeiro campo errado ou rola para o erro geral
        if (hasError) {
            if (firstErrorField) {
                firstErrorField.focus();
                // Opcional: rolar para o campo, mas o foco já ajuda
                // firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (currentTotalItems === 0) {
                 // Rola para a mensagem de erro do pedido vazio se for o único erro
                 whatsappError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return; // Interrompe
        }

        // Se passou nas validações:
        const message = generateWhatsAppMessage();

        if (!message) {
            console.error("Falha crítica ao gerar mensagem após validações.");
            whatsappError.textContent = "Ocorreu um erro inesperado. Recarregue a página e tente novamente.";
            whatsappError.style.display = 'block';
            return;
        }

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${restauranteWhatsAppNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    }

    // --- Adicionar Event Listeners ---

    // Listener para itens do menu
    menuItems.forEach(item => {
        const quantityInput = item.querySelector('.quantity-input');
        const observationsInput = item.querySelector('.observations-input');
        if (quantityInput) { quantityInput.addEventListener('input', handleItemChange); }
        if (observationsInput) { observationsInput.addEventListener('input', handleItemChange); }
    });

    // Listener para o botão do WhatsApp
    if (whatsappButton) {
        whatsappButton.addEventListener('click', handleWhatsAppClick);
    }

    // Listener para o checkbox de agendamento
     if (scheduleCheckbox) {
        scheduleCheckbox.addEventListener('change', () => {
            if (scheduleCheckbox.checked) {
                scheduleFieldsDiv.style.display = 'block';
                setMinDate(); // Garante que a data mínima está correta ao mostrar
                 // Opcional: Focar no campo de data ao marcar
                 // scheduleDateInput.focus();
            } else {
                scheduleFieldsDiv.style.display = 'none';
                // Limpa campos e erro ao desmarcar
                scheduleDateInput.value = '';
                scheduleTimeInput.value = '';
                scheduleError.style.display = 'none';
            }
        });
    }

    // Limpa erros inline ao digitar nos campos respectivos
     if (clientNameInput) { clientNameInput.addEventListener('input', () => nameError.style.display = 'none'); }
     if (scheduleDateInput) { scheduleDateInput.addEventListener('input', () => scheduleError.style.display = 'none'); }
     if (scheduleTimeInput) { scheduleTimeInput.addEventListener('input', () => scheduleError.style.display = 'none'); }

    // --- Inicialização ---
     setMinDate(); // Define a data mínima inicial

}); // Fim do DOMContentLoaded