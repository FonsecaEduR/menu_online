document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const menuContentArea = document.getElementById('menu-content-area');
    const orderSummaryDiv = document.getElementById('order-summary');
    const totalPriceDiv = document.getElementById('total-price');
    const whatsappButton = document.getElementById('whatsapp-button');
    const clientNameInput = document.getElementById('client-name-input');
    const scheduleCheckbox = document.getElementById('schedule-checkbox');
    const scheduleFieldsDiv = document.getElementById('schedule-fields');
    const scheduleDateInput = document.getElementById('schedule-date');
    const scheduleTimeInput = document.getElementById('schedule-time');
    const nameError = document.getElementById('name-error');
    const scheduleError = document.getElementById('schedule-error');
    const whatsappError = document.getElementById('whatsapp-error');

    // --- Configuração ---
    const restauranteWhatsAppNumber = '5519971314811'; // <<<< SUBSTITUA PELO NÚMERO REAL

    // --- Estado do Pedido ---
    let currentOrder = {}; // { itemId: { name, price, quantity, observations }, ... }

    // --- Variável para guardar dados do menu ---
    let menuData = null; // Será preenchido após carregar o JSON

    // --- Funções Auxiliares ---
    function formatCurrency(value) {
         if (typeof value !== 'number' || isNaN(value)) {
             console.warn("Tentando formatar valor não numérico:", value);
             return "R$ --,--";
         }
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDateForDisplay(isoDate) {
        if (!isoDate) return '';
        try {
             const [year, month, day] = isoDate.split('-');
             if (!year || !month || !day || year.length !== 4 || month.length !== 2 || day.length !== 2) {
                 throw new Error("Formato de data inválido");
             }
             const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              if (isNaN(date.getTime())) {
                    throw new Error("Data inválida");
              }
             if (date.getFullYear() !== parseInt(year) || date.getMonth() !== parseInt(month) - 1 || date.getDate() !== parseInt(day)) {
                 throw new Error("Inconsistência na data após conversão");
             }
             return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            console.error("Erro ao formatar data:", isoDate, e);
            return isoDate;
        }
    }

     function setMinDate() {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today.getTime() - offset);
        const dateString = localDate.toISOString().split('T')[0];
        if(scheduleDateInput) {
            scheduleDateInput.min = dateString;
        }
    }

    // --- Funções de Atualização da Interface ---
    function updateOrderSummary() {
        orderSummaryDiv.innerHTML = '';
        let hasItems = false;
        const sortedItemIds = Object.keys(currentOrder).sort((a, b) => {
            const nameA = currentOrder[a]?.name || '';
            const nameB = currentOrder[b]?.name || '';
            return nameA.localeCompare(nameB);
        });

        sortedItemIds.forEach(itemId => {
            const item = currentOrder[itemId];
            if (item && item.quantity > 0) {
                hasItems = true;
                const itemElement = document.createElement('div');
                itemElement.classList.add('summary-item');
                let itemText = `<strong>${item.quantity}x ${item.name}</strong>`;
                if (item.observations) {
                    itemText += ` <span style="font-style: italic; color: #555;">(Obs: ${item.observations})</span>`;
                }
                if (typeof item.price === 'number' && typeof item.quantity === 'number') {
                     itemText += ` - ${formatCurrency(item.price * item.quantity)}`;
                } else {
                     itemText += ` - (Preço Indisp.)`;
                }
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
             const item = currentOrder[itemId];
             if (item && typeof item.price === 'number' && typeof item.quantity === 'number') {
                 total += item.price * item.quantity;
             }
        }
        totalPriceDiv.textContent = `Total: ${formatCurrency(total)}`;
    }

    // --- Função Central para Atualizar o Estado do Pedido ---
    function updateOrderItem(itemId, quantity, observation = null) {
        const menuItemElement = document.querySelector(`.menu-item[data-item-id="${itemId}"]`);
        if (!menuItemElement) {
            console.warn(`Elemento DOM para item ${itemId} não encontrado.`);
            return;
        }

        const itemName = menuItemElement.dataset.itemName;
        const itemPrice = parseFloat(menuItemElement.dataset.itemPrice);

         if (!itemName || isNaN(itemPrice)) {
            console.error(`Dados inválidos para item ${itemId}: Nome='${itemName}', Preço='${itemPrice}'`);
            return;
         }

        if (quantity > 0) {
            if (!currentOrder[itemId]) {
                currentOrder[itemId] = { name: itemName, price: itemPrice, quantity: 0, observations: '' };
            }
            currentOrder[itemId].quantity = quantity;
            if (observation !== null) {
                currentOrder[itemId].observations = observation;
            }
            const obsInput = menuItemElement.querySelector('.observations-input');
            if (obsInput) obsInput.value = currentOrder[itemId].observations;

        } else {
            delete currentOrder[itemId];
            const obsInput = menuItemElement.querySelector('.observations-input');
            if (obsInput) obsInput.value = '';
        }

        updateOrderSummary();
        updateTotalPrice();
        if (Object.keys(currentOrder).length > 0) {
            whatsappError.style.display = 'none';
        }
    }

    // --- Funções de Manipulação de Eventos dos Itens ---
    function handleQuantityButtonClick(event) {
        const button = event.target;
        const menuItemElement = button.closest('.menu-item');
        if (!menuItemElement) return;

        const itemId = menuItemElement.dataset.itemId;
        const quantityDisplay = menuItemElement.querySelector('.quantity-display');
        if (!quantityDisplay) return;

        let currentQuantity = parseInt(quantityDisplay.textContent) || 0;
        let newQuantity = currentQuantity;

        if (button.classList.contains('quantity-increase')) {
            newQuantity++;
        } else if (button.classList.contains('quantity-decrease')) {
            newQuantity = Math.max(0, currentQuantity - 1);
        }

        quantityDisplay.textContent = newQuantity;
        updateOrderItem(itemId, newQuantity);
    }

    // Usa o evento 'change' para observações
    function handleObservationChange(event) {
        const input = event.target;
        const menuItemElement = input.closest('.menu-item');
        if (!menuItemElement) return;

        const itemId = menuItemElement.dataset.itemId;
        const observationText = input.value.trim();
        const quantityDisplay = menuItemElement.querySelector('.quantity-display');
        if (!quantityDisplay) return;

        const currentQuantity = parseInt(quantityDisplay.textContent) || 0;

        if (currentQuantity > 0) {
            updateOrderItem(itemId, currentQuantity, observationText);
        } else {
             input.value = '';
        }
    }


    // --- Função para Gerar Mensagem WhatsApp (Categorizada) ---
    function generateWhatsAppMessage() {
        if (!menuData) {
            console.error("Dados do menu ainda não carregados para gerar mensagem.");
            return null;
        }

        const clientName = clientNameInput.value.trim();
        const isScheduled = scheduleCheckbox.checked;
        const scheduleDate = scheduleDateInput.value;
        const scheduleTime = scheduleTimeInput.value;

        if (Object.keys(currentOrder).length === 0 || !clientName) return null;
        if (isScheduled && (!scheduleDate || !scheduleTime)) return null;

        let message = `Pedido de: *${clientName}* 👋\n\n`;
        if (isScheduled && scheduleDate && scheduleTime) {
            message += `*AGENDAMENTO:* ${formatDateForDisplay(scheduleDate)} às ${scheduleTime}\n`;
            message += `--------------------\n`;
        }

        let total = 0;
        let messageBody = "";

        // Itera pelas CATEGORIAS do menu original
        menuData.categorias.forEach(categoria => {
            let itemsInCategoryText = "";

            // Itera pelos ITENS DA CATEGORIA original
            categoria.itens.forEach(itemOriginal => {
                const itemId = itemOriginal.id;
                // Verifica se este item está no PEDIDO ATUAL
                if (currentOrder[itemId] && currentOrder[itemId].quantity > 0) {
                    const itemPedido = currentOrder[itemId];

                    itemsInCategoryText += `*${itemPedido.quantity}x ${itemPedido.name}*`;
                    if (itemPedido.observations) {
                        itemsInCategoryText += `\n  📝 _Obs: ${itemPedido.observations}_`;
                    }
                    itemsInCategoryText += `\n`;
                }
            });

            // Se achou itens da categoria no pedido, adiciona o bloco
            if (itemsInCategoryText) {
                // Usar um emoji genérico ou mapear IDs para emojis, se quiser
                 const categoryEmoji = "🍽️"; // Exemplo
                messageBody += `\n${categoryEmoji} *${categoria.titulo}:*\n`;
                messageBody += itemsInCategoryText;
            }
        });

        // Calcula o total iterando pelo pedido atual
        for (const itemId in currentOrder) {
            const item = currentOrder[itemId];
            if (item && typeof item.price === 'number' && typeof item.quantity === 'number') {
                total += item.price * item.quantity;
            }
        }

        // Adiciona o corpo categorizado (se houver)
        if (!messageBody && Object.keys(currentOrder).length > 0) {
             // Se currentOrder tem itens mas messageBody está vazio, houve um erro lógico
             console.error("Inconsistência: Pedido não vazio, mas nenhum item categorizado encontrado.");
             messageBody = "\n*Itens (Erro na categorização - verificar console)*\n"; // Mensagem de fallback
             Object.values(currentOrder).forEach(itemPedido => { // Lista não categorizada como fallback
                  if(itemPedido.quantity > 0) {
                     messageBody += `*${itemPedido.quantity}x ${itemPedido.name}*\n`;
                  }
             });
        }
        message += messageBody;


        message += `\n*Total do Pedido: ${formatCurrency(total)}*\n`;
        message += `--------------------\n`;
        message += `(Pedido gerado via cardápio online ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})})`;

        return message;
    }

    // --- Função de Clique no Botão WhatsApp ---
    function handleWhatsAppClick() {
        const clientName = clientNameInput.value.trim();
        const isScheduled = scheduleCheckbox.checked;
        const scheduleDate = scheduleDateInput.value;
        const scheduleTime = scheduleTimeInput.value;
        const currentTotalItems = Object.keys(currentOrder).length;

        nameError.style.display = 'none';
        scheduleError.style.display = 'none';
        whatsappError.style.display = 'none';

        let hasError = false;
        let firstErrorField = null;

        if (!clientName) { nameError.style.display = 'block'; hasError = true; firstErrorField = clientNameInput; }
        if (isScheduled && (!scheduleDate || !scheduleTime)) { scheduleError.style.display = 'block'; hasError = true; if (!firstErrorField) firstErrorField = !scheduleDate ? scheduleDateInput : scheduleTimeInput; }
        if (currentTotalItems === 0) { whatsappError.style.display = 'block'; hasError = true; }

        if (hasError) {
            if (firstErrorField) {
                 firstErrorField.focus();
                 firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            } else if (currentTotalItems === 0) {
                whatsappError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const message = generateWhatsAppMessage();
        if (!message) {
            console.error("Falha ao gerar mensagem após validações.");
            whatsappError.textContent = "Ocorreu um erro inesperado ao formatar o pedido. Recarregue a página.";
            whatsappError.style.display = 'block';
            return;
        }

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${restauranteWhatsAppNumber}?text=${encodedMessage}`;

        const newWindow = window.open(whatsappUrl, '_blank');
         if (!newWindow || newWindow.closed || typeof newWindow.closed=='undefined') {
             console.warn("Popup bloqueado ou falhou ao abrir. Tentando redirecionamento.");
             window.location.href = whatsappUrl;
         }
    }


    // --- Função para Carregar e Renderizar Menu do JSON ---
    async function loadMenuFromJson() {
        try {
            const response = await fetch('menu.json');
            if (!response.ok) {
                console.error(`Falha ao buscar menu.json: ${response.status} ${response.statusText}`);
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const contentType = response.headers.get("content-type");
             if (!contentType || !contentType.includes("application/json")) {
                 console.error(`Resposta inesperada não é JSON: ${contentType}`);
                 const textResponse = await response.text();
                 console.error("Conteúdo recebido:", textResponse);
                 throw new TypeError("Resposta não é JSON");
             }

            const menuDataFetched = await response.json(); // Usa variável temporária

            if (!menuDataFetched || !Array.isArray(menuDataFetched.categorias)) {
                 console.error("Estrutura do menu.json inválida.");
                 throw new Error("Formato JSON inválido");
             }

            // Atribui os dados carregados à variável de escopo superior
            menuData = menuDataFetched;

            menuContentArea.innerHTML = ''; // Limpa "Carregando..."

            menuData.categorias.forEach(categoria => {
                if (!categoria || !categoria.id || !categoria.titulo || !Array.isArray(categoria.itens)) {
                     console.warn("Categoria inválida ou incompleta:", categoria);
                     return;
                 }

                const categorySection = document.createElement('section');
                categorySection.id = categoria.id;
                categorySection.classList.add('menu-category');

                const categoryTitle = document.createElement('h2');
                categoryTitle.classList.add('category-title');
                categoryTitle.textContent = categoria.titulo;
                categorySection.appendChild(categoryTitle);

                categoria.itens.forEach(item => {
                    if (!item || !item.id || !item.nome || typeof item.preco !== 'number') {
                        console.warn(`Item inválido ou incompleto na categoria ${categoria.id}:`, item);
                        return;
                     }

                    const itemArticle = document.createElement('article');
                    itemArticle.classList.add('menu-item');
                    itemArticle.dataset.itemId = item.id;
                    itemArticle.dataset.itemName = item.nome;
                    itemArticle.dataset.itemPrice = item.preco;

                    // Imagem
                    if (item.imagem && typeof item.imagem === 'string' && item.imagem.trim() !== "") {
                        const imageContainer = document.createElement('div');
                        imageContainer.classList.add('item-image-container');
                        const imgElement = document.createElement('img');
                        imgElement.src = item.imagem;
                        imgElement.alt = `Foto de ${item.nome}`;
                        imgElement.classList.add('item-image');
                        imgElement.loading = 'lazy';
                        imgElement.onerror = () => {
                             console.warn(`Imagem não encontrada: ${item.imagem}`);
                             imgElement.style.display = 'none';
                             imageContainer.style.display = 'none';
                        };
                        imageContainer.appendChild(imgElement);
                        itemArticle.appendChild(imageContainer);
                    }

                    // Details (Info + Obs)
                    const itemDetailsDiv = document.createElement('div');
                    itemDetailsDiv.classList.add('item-details');

                    // Info
                    const itemInfoDiv = document.createElement('div');
                    itemInfoDiv.classList.add('item-info');
                    const itemNameH3 = document.createElement('h3');
                    itemNameH3.classList.add('item-name');
                    itemNameH3.textContent = item.nome;
                    itemInfoDiv.appendChild(itemNameH3);
                    if (item.descricao && typeof item.descricao === 'string' && item.descricao.trim() !== '') {
                        const itemDescP = document.createElement('p');
                        itemDescP.classList.add('item-description');
                        itemDescP.textContent = item.descricao;
                        itemInfoDiv.appendChild(itemDescP);
                    }
                    const itemPriceP = document.createElement('p');
                    itemPriceP.classList.add('item-price');
                    itemPriceP.textContent = formatCurrency(item.preco);
                    itemInfoDiv.appendChild(itemPriceP);
                    itemDetailsDiv.appendChild(itemInfoDiv);

                    // Observação
                    const itemObsDiv = document.createElement('div');
                    itemObsDiv.classList.add('item-observation-wrapper');
                    const obsLabel = document.createElement('label');
                    obsLabel.htmlFor = `obs-${item.id}`;
                    obsLabel.classList.add('sr-only');
                    obsLabel.textContent = 'Observações';
                    const obsInput = document.createElement('input');
                    obsInput.type = 'text';
                    obsInput.id = `obs-${item.id}`;
                    obsInput.classList.add('observations-input');
                    obsInput.placeholder = 'Observações? (Ex: sem cebola)';
                    obsInput.setAttribute('aria-label', `Observações para ${item.nome}`);
                    obsInput.addEventListener('change', handleObservationChange); // Usa 'change'
                    itemObsDiv.appendChild(obsLabel);
                    itemObsDiv.appendChild(obsInput);
                    itemDetailsDiv.appendChild(itemObsDiv);

                    itemArticle.appendChild(itemDetailsDiv);

                    // Controles de Quantidade
                    const itemControlsDiv = document.createElement('div');
                    itemControlsDiv.classList.add('item-controls', 'quantity-controls');
                    const decreaseButton = document.createElement('button');
                    decreaseButton.type = 'button';
                    decreaseButton.classList.add('quantity-button', 'quantity-decrease');
                    decreaseButton.innerHTML = '−';
                    decreaseButton.setAttribute('aria-label', `Diminuir quantidade de ${item.nome}`);
                    decreaseButton.addEventListener('click', handleQuantityButtonClick);

                    const quantityDisplay = document.createElement('span');
                    quantityDisplay.classList.add('quantity-display');
                    quantityDisplay.textContent = '0';
                    quantityDisplay.setAttribute('aria-live', 'polite');

                    const increaseButton = document.createElement('button');
                    increaseButton.type = 'button';
                    increaseButton.classList.add('quantity-button', 'quantity-increase');
                    increaseButton.innerHTML = '+';
                    increaseButton.setAttribute('aria-label', `Aumentar quantidade de ${item.nome}`);
                    increaseButton.addEventListener('click', handleQuantityButtonClick);

                    itemControlsDiv.appendChild(decreaseButton);
                    itemControlsDiv.appendChild(quantityDisplay);
                    itemControlsDiv.appendChild(increaseButton);
                    itemArticle.appendChild(itemControlsDiv);

                    categorySection.appendChild(itemArticle);
                });
                menuContentArea.appendChild(categorySection);
            });

        } catch (error) {
            console.error('Erro fatal ao carregar ou processar o cardápio:', error);
             let userErrorMessage = "Erro ao carregar o cardápio. ";
             if (error instanceof SyntaxError) { userErrorMessage += "Verifique se o arquivo 'menu.json' está formatado corretamente."; }
             else if (error instanceof TypeError && error.message.includes("NetworkError")) { userErrorMessage += "Falha na conexão ao buscar o cardápio."; }
             else if (error instanceof TypeError) { userErrorMessage += "Formato de dados inesperado no 'menu.json'."; }
             else { userErrorMessage += "Tente recarregar a página ou contate o suporte."; }
             menuContentArea.innerHTML = `<p class="error-message">${userErrorMessage}</p>`;
        }
    }

    // --- Adicionar Event Listeners Globais ---
    if (whatsappButton) { whatsappButton.addEventListener('click', handleWhatsAppClick); }
    if (scheduleCheckbox) {
        scheduleCheckbox.addEventListener('change', () => {
            // Verifica se os elementos relacionados existem antes de manipulá-los
            if (!scheduleFieldsDiv || !scheduleDateInput || !scheduleTimeInput || !scheduleError) {
                console.warn("Elementos de agendamento não encontrados no DOM.");
                return;
            }
            if (scheduleCheckbox.checked) {
                scheduleFieldsDiv.style.display = 'block';
                setMinDate(); // Define data mínima ao exibir
            } else {
                scheduleFieldsDiv.style.display = 'none';
                scheduleDateInput.value = ''; // Limpa campos ao esconder
                scheduleTimeInput.value = '';
                scheduleError.style.display = 'none'; // Esconde erro
            }
        });
    }
    // Listeners para limpar erros inline (verificam se elemento existe)
    if (clientNameInput && nameError) { clientNameInput.addEventListener('input', () => nameError.style.display = 'none'); }
    if (scheduleDateInput && scheduleError) { scheduleDateInput.addEventListener('input', () => scheduleError.style.display = 'none'); }
    if (scheduleTimeInput && scheduleError) { scheduleTimeInput.addEventListener('input', () => scheduleError.style.display = 'none'); }

    // --- Inicialização ---
    setMinDate();
    loadMenuFromJson(); // Inicia o carregamento do menu

}); // Fim do DOMContentLoaded