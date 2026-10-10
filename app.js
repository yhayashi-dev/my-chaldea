(() => {
  "use strict";

  const STORAGE_KEY = window.FgoSafeStore.KEY;
  const CLASS_LABELS = {
    saber: "セイバー", archer: "アーチャー", lancer: "ランサー",
    rider: "ライダー", caster: "キャスター", assassin: "アサシン",
    berserker: "バーサーカー", ruler: "ルーラー", avenger: "アヴェンジャー",
    alterEgo: "アルターエゴ", moonCancer: "ムーンキャンサー",
    foreigner: "フォーリナー", pretender: "プリテンダー",
    shielder: "シールダー", beast: "ビースト", beastEresh: "ビースト",
    unBeastOlgaMarie: "ビースト"
  };
  const CE_CATEGORY_LABELS = {
    normal: "通常", event: "イベント", bond: "絆礼装", campaign: "記念",
    valentine: "バレンタイン", exp: "経験値用", other: "その他"
  };
  const OLGA_PARTY_COUNT = 10;
  const OLGA_MEMBER_COUNT = 3;
  const RESOURCE_GROUPS = [
    { title: "基本資源", fields: [["qp", "QP"], ["rarePrism", "レアプリズム"], ["manaPrism", "マナプリズム"], ["friendPoints", "フレンドポイント"], ["grails", "聖杯"], ["grailFragments", "聖杯の雫"], ["lore", "伝承結晶"], ["purePrism", "ピュアプリズム"]] },
    { title: "AP回復アイテム", fields: [["bronzeSeedling", "青銅の苗木"], ["bronzeFruit", "青銅の果実"], ["copperFruit", "赤銅の果実"], ["silverFruit", "白銀の果実"], ["goldFruit", "黄金の果実"]] },
    { title: "スキル石・再臨素材", fields: ["剣", "弓", "槍", "騎", "術", "殺", "狂"].flatMap((name, i) => [[`class${i + 1}GemLow`, `${name}の輝石`], [`class${i + 1}GemMid`, `${name}の魔石`], [`class${i + 1}GemHigh`, `${name}の秘石`], [`class${i + 1}Piece`, `${name}のピース`], [`class${i + 1}Monument`, `${name}のモニュメント`]]) },
    { title: "銅素材（ゲーム内順）", fields: [
      ["material3", "英雄の証"], ["material1", "凶骨"], ["material2", "竜の牙"], ["material4", "虚影の塵"],
      ["material37", "愚者の鎖"], ["material38", "万死の毒針"], ["material39", "魔術髄液"], ["material46", "宵哭きの鉄杭"],
      ["material47", "励振火薬"], ["material33", "赦免の小鐘"], ["material29", "黄昏の儀式剣"], ["material30", "忘れじの灰"],
      ["material34", "黒曜鋭刃"], ["material35", "狂気の残滓"]
    ] },
    { title: "銀素材（ゲーム内順）", fields: [
      ["material5", "世界樹の種"], ["material6", "ゴーストランタン"], ["material7", "八連双晶"], ["material8", "蛇の宝玉"],
      ["material9", "鳳凰の羽根"], ["material10", "無間の歯車"], ["material11", "禁断の頁"], ["material12", "ホムンクルスベビー"],
      ["material13", "隕蹄鉄"], ["material14", "大騎士勲章"], ["material40", "追憶の貝殻"], ["material48", "枯淡勾玉"],
      ["material42", "永遠結氷"], ["material43", "巨人の指輪"], ["material41", "オーロラ鋼"], ["material44", "閑古鈴"],
      ["material45", "禍罪の矢尻"], ["material49", "光銀の冠"], ["material32", "神脈霊子"], ["material50", "虹の糸玉"],
      ["material31", "夢幻の鱗粉"], ["material51", "太陽皮"], ["material52", "エーテル収光体"], ["material53", "終の花"],
      ["material54", "ユニバーサルキューブ"], ["material55", "神彩のレンズ"]
    ] },
    { title: "金素材（ゲーム内順）", fields: [
      ["material56", "混沌の爪"], ["material25", "蛮神の心臓"], ["material24", "竜の逆鱗"], ["material15", "精霊根"],
      ["material16", "戦馬の幼角"], ["material19", "血の涙石"], ["material20", "黒獣脂"], ["material21", "封魔のランプ"],
      ["material22", "智慧のスカラベ"], ["material17", "原初の産毛"], ["material18", "呪獣胆石"], ["material23", "奇奇神酒"],
      ["material57", "暁光炉心"], ["material58", "九十九鏡"], ["material26", "真理の卵"], ["material59", "煌星のカケラ"],
      ["material27", "悠久の実"], ["material28", "鬼炎鬼灯"], ["material36", "黄金釜"], ["material60", "月光核"],
      ["material61", "天命の聖水"], ["material62", "遺霊箱"]
    ] },
    { title: "クラススコア・その他", fields: [
      ["tourLeaf", "巡霊の葉"], ["stormPod", "ストームポッド"], ["starlightSand", "星光の砂"],
      ["torchLow", "新星のトーチ"], ["torchMid", "明星のトーチ"], ["torchHigh", "極星のトーチ"],
      ["retrogradeCompass", "遡行の羅針盤"], ["returnHourglass", "回帰の砂時計"]
    ] }
  ];

  const servants = Array.isArray(window.SERVANTS) ? window.SERVANTS : [];
  const mysticCodes = Array.isArray(window.MYSTIC_CODES) ? window.MYSTIC_CODES : [];
  const craftEssences = Array.isArray(window.CRAFT_ESSENCES) ? window.CRAFT_ESSENCES : [];
  const safeStore = window.FgoSafeStore.create({storage: localStorage, locks: navigator.locks,
    digest: async text => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,"0")).join(""),
    catalog: Object.fromEntries(servants.map(s=>[String(s.id),s]))});
  let baseRevision = 0;
  let storageBlocked = false;
  let storageProblem = "";
  let saving = false;
  let state = loadState();
  let currentServantId = null;
  let currentMysticCodeId = null;
  let currentCraftEssenceId = null;
  let toastTimer = null;

  const elements = {
    viewTabs: [...document.querySelectorAll("[data-view]")],
    servantView: document.querySelector("#servant-view"),
    mysticCodeView: document.querySelector("#mystic-code-view"),
    craftEssenceView: document.querySelector("#craft-essence-view"),
    inventoryView: document.querySelector("#inventory-view"),
    olgaMarieView: document.querySelector("#olga-marie-view"),
    inventoryGroups: document.querySelector("#inventory-groups"),
    inventoryQpSummary: document.querySelector("#inventory-qp-summary"),
    inventoryEnteredCount: document.querySelector("#inventory-entered-count"),
    inventoryGrailSummary: document.querySelector("#inventory-grail-summary"),
    inventoryLoreSummary: document.querySelector("#inventory-lore-summary"),
    olgaQuestSelect: document.querySelector("#olga-quest-select"),
    olgaModeSelect: document.querySelector("#olga-mode-select"),
    olgaPartyCount: document.querySelector("#olga-party-count"),
    olgaServantCount: document.querySelector("#olga-servant-count"),
    olgaCeCount: document.querySelector("#olga-ce-count"),
    olgaDuplicateSummary: document.querySelector("#olga-duplicate-summary"),
    olgaDuplicateWarning: document.querySelector("#olga-duplicate-warning"),
    olgaPartyList: document.querySelector("#olga-party-list"),
    olgaOverallNotes: document.querySelector("#olga-overall-notes"),
    olgaExportPreview: document.querySelector("#olga-export-preview"),
    olgaServantOptions: document.querySelector("#olga-servant-options"),
    olgaCeOptions: document.querySelector("#olga-ce-options"),
    olgaSourceNote: document.querySelector("#olga-source-note"),
    grid: document.querySelector("#servant-grid"),
    search: document.querySelector("#search-input"),
    classFilter: document.querySelector("#class-filter"),
    rarityFilter: document.querySelector("#rarity-filter"),
    ownedFilter: document.querySelector("#owned-filter"),
    sortOrder: document.querySelector("#sort-order"),
    resultCount: document.querySelector("#result-count"),
    ownedCount: document.querySelector("#owned-count"),
    trainedCount: document.querySelector("#trained-count"),
    totalCount: document.querySelector("#total-count"),
    updatedAt: document.querySelector("#updated-at"),
    backupStatus: document.querySelector("#backup-status"),
    editor: document.querySelector("#editor-dialog"),
    editorForm: document.querySelector("#editor-form"),
    editorFace: document.querySelector("#editor-face"),
    editorName: document.querySelector("#editor-name"),
    editorMeta: document.querySelector("#editor-meta"),
    editorOwned: document.querySelector("#editor-owned"),
    editorLevel: document.querySelector("#editor-level"),
    editorNp: document.querySelector("#editor-np"),
    editorCoins: document.querySelector("#editor-coins"),
    editorHpEnhancement: document.querySelector("#editor-hp-enhancement"),
    editorAtkEnhancement: document.querySelector("#editor-atk-enhancement"),
    editorNotes: document.querySelector("#editor-notes"),
    trainingFields: document.querySelector("#training-fields"),
    exportDialog: document.querySelector("#export-dialog"),
    exportText: document.querySelector("#export-text"),
    restoreInput: document.querySelector("#restore-input"),
    mysticGrid: document.querySelector("#mystic-code-grid"),
    mysticSearch: document.querySelector("#mystic-search-input"),
    mysticOwnedFilter: document.querySelector("#mystic-owned-filter"),
    mysticResultCount: document.querySelector("#mystic-result-count"),
    mysticOwnedCount: document.querySelector("#mystic-owned-count"),
    mysticMaxCount: document.querySelector("#mystic-max-count"),
    mysticTotalCount: document.querySelector("#mystic-total-count"),
    mysticEditor: document.querySelector("#mystic-editor-dialog"),
    mysticEditorForm: document.querySelector("#mystic-editor-form"),
    mysticEditorImage: document.querySelector("#mystic-editor-image"),
    mysticEditorName: document.querySelector("#mystic-editor-name"),
    mysticEditorDetail: document.querySelector("#mystic-editor-detail"),
    mysticEditorOwned: document.querySelector("#mystic-editor-owned"),
    mysticEditorLevel: document.querySelector("#mystic-editor-level"),
    mysticEditorSkills: document.querySelector("#mystic-editor-skills"),
    mysticTrainingFields: document.querySelector("#mystic-training-fields"),
    ceGrid: document.querySelector("#craft-essence-grid"),
    ceSearch: document.querySelector("#ce-search-input"),
    ceCategoryFilter: document.querySelector("#ce-category-filter"),
    ceRarityFilter: document.querySelector("#ce-rarity-filter"),
    ceOwnedFilter: document.querySelector("#ce-owned-filter"),
    ceSortOrder: document.querySelector("#ce-sort-order"),
    ceResultCount: document.querySelector("#ce-result-count"),
    ceOwnedCount: document.querySelector("#ce-owned-count"),
    ceMlbCount: document.querySelector("#ce-mlb-count"),
    ceMaxCount: document.querySelector("#ce-max-count"),
    ceTotalCount: document.querySelector("#ce-total-count"),
    ceEditor: document.querySelector("#ce-editor-dialog"),
    ceEditorForm: document.querySelector("#ce-editor-form"),
    ceEditorImage: document.querySelector("#ce-editor-image"),
    ceEditorMeta: document.querySelector("#ce-editor-meta"),
    ceEditorName: document.querySelector("#ce-editor-name"),
    ceEditorStats: document.querySelector("#ce-editor-stats"),
    ceEditorOwned: document.querySelector("#ce-editor-owned"),
    ceEditorCopies: document.querySelector("#ce-editor-copies"),
    ceEditorMlbCopies: document.querySelector("#ce-editor-mlb-copies"),
    ceEditorLevel: document.querySelector("#ce-editor-level"),
    ceEditorNotes: document.querySelector("#ce-editor-notes"),
    ceTrainingFields: document.querySelector("#ce-training-fields"),
    toast: document.querySelector("#toast")
  };

  const skillSelects = [1, 2, 3].map(n => document.querySelector(`#editor-skill-${n}`));
  const appendSelects = [1, 2, 3, 4, 5].map(n => document.querySelector(`#editor-append-${n}`));

  function normalizedClassName(className) {
    return ["beast", "beastEresh", "unBeastOlgaMarie"].includes(className) ? "beast" : className;
  }

  function emptyState() {
    return { version: 1, updatedAt: null, lastBackupAt: null, roster: {}, mysticCodes: {}, craftEssences: {}, inventory: {}, olgaMarie: emptyOlgaMarieState() };
  }

  function emptyOlgaMarieState() {
    return { selectedQuest: "1", selectedMode: "通常", records: {} };
  }

  function loadState() {
    try { const e=safeStore.load(); baseRevision=e?.revision||0; return e?.data||emptyState(); }
    catch(error) {storageBlocked=true; storageProblem=error.message; return emptyState();}
  }

  async function saveState(options={}) {
    if(storageBlocked || saving){updateSafetyStatus();showToast(storageProblem||"保存中です。完了を待ってください");return false;}
    saving=true;
    const controls=[...document.querySelectorAll("input, select, textarea, button")].map(e=>[e,e.disabled]);
    controls.forEach(([e])=>e.disabled=true);
    try {const e=await safeStore.commit(state,baseRevision,options);state=e.data;baseRevision=e.revision;updateSummary();return true;}
    catch(error){storageBlocked=true;storageProblem=error.message;showToast(error.message+"（再読込するまで保存停止）");return false;}
    finally{saving=false;controls.forEach(([e,disabled])=>e.disabled=disabled);updateSafetyStatus();}
  }

  function recordFor(id) {
    return state.roster[String(id)] || null;
  }

  function mysticRecordFor(id) {
    return state.mysticCodes[String(id)] || null;
  }

  function craftEssenceRecordFor(id) {
    return state.craftEssences[String(id)] || null;
  }

  function inventoryValue(key) {
    return state.inventory?.[key] ?? "";
  }

  function formatInventoryValue(value) {
    return value === "" || value === null || value === undefined ? "未入力" : Number(value).toLocaleString("ja-JP");
  }

  function renderInventory() {
    const fragment = document.createDocumentFragment();
    for (const group of RESOURCE_GROUPS) {
      const section = document.createElement("section");
      section.className = "inventory-group";
      section.innerHTML = `<h2>${escapeHtml(group.title)}</h2>`;
      const grid = document.createElement("div");
      grid.className = "inventory-grid";
      for (const [key, label] of group.fields) {
        const field = document.createElement("label");
        field.className = "inventory-field";
        field.innerHTML = `<span>${escapeHtml(label)}</span><input type="text" inputmode="numeric" lang="en" autocomplete="off" pattern="[0-9]*" data-inventory-key="${escapeAttribute(key)}" placeholder="未入力">`;
        field.querySelector("input").value = inventoryValue(key);
        grid.append(field);
      }
      section.append(grid);
      fragment.append(section);
    }
    const custom = document.createElement("section");
    custom.className = "inventory-group";
    custom.innerHTML = `<h2>その他・新素材</h2><p class="field-help">一覧にない新素材やイベント素材は、名前と所持数をメモしてください。</p><textarea id="inventory-custom-notes" rows="4" placeholder="例：新素材A 120個\nイベント素材B 80個"></textarea>`;
    custom.querySelector("textarea").value = state.inventory.customNotes || "";
    fragment.append(custom);
    elements.inventoryGroups.replaceChildren(fragment);
    updateInventorySummary();
  }

  async function saveInventoryField(key, value) {
    if (value === "") delete state.inventory[key];
    else state.inventory[key] = Math.max(0, Number(value));
    if (!(await saveState())) return;
  }

  function updateInventorySummary() {
    const entries = Object.entries(state.inventory || {}).filter(([key, value]) => key !== "customNotes" && value !== "" && value !== null && value !== undefined);
    elements.inventoryQpSummary.textContent = formatInventoryValue(inventoryValue("qp"));
    elements.inventoryEnteredCount.textContent = entries.length;
    elements.inventoryGrailSummary.textContent = formatInventoryValue(inventoryValue("grails"));
    elements.inventoryLoreSummary.textContent = formatInventoryValue(inventoryValue("lore"));
  }

  function craftEssenceCategory(craftEssence) {
    const flag = craftEssence.flag;
    if (flag === "svtEquipFriendShip") return "bond";
    if (flag === "svtEquipChocolate") return "valentine";
    if (flag === "svtEquipExp") return "exp";
    if (flag === "svtEquipEvent" || flag === "svtEquipEventReward") return "event";
    if (flag === "svtEquipCampaign") return "campaign";
    if (flag === "normal" || flag === "svtEquipManaExchange") return "normal";
    return "other";
  }

  function hasCompleteSkills(record) {
    if (!record || !record.owned) return false;
    return Array.isArray(record.skills) && record.skills.length === 3 && record.skills.every(Boolean);
  }

  function isIncomplete(record) {
    if (!record?.owned) return false;
    return !record.level || !record.np || !record.skills || record.skills.some(value => !value);
  }

  function populateSelectors() {
    const classes = [...new Set(servants.map(servant => normalizedClassName(servant.className)))]
      .sort((a, b) => (CLASS_LABELS[a] || a).localeCompare(CLASS_LABELS[b] || b, "ja"));
    for (const className of classes) {
      const option = document.createElement("option");
      option.value = className;
      option.textContent = CLASS_LABELS[className] || className;
      elements.classFilter.append(option);
    }

    for (const select of [...skillSelects, ...appendSelects]) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "-";
      select.append(empty);
      for (let level = 1; level <= 10; level += 1) {
        const option = document.createElement("option");
        option.value = String(level);
        option.textContent = String(level);
        select.append(option);
      }
    }

    const emptyMysticLevel = document.createElement("option");
    emptyMysticLevel.value = "";
    emptyMysticLevel.textContent = "未入力";
    elements.mysticEditorLevel.append(emptyMysticLevel);
    for (let level = 1; level <= 10; level += 1) {
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = `Lv.${level}`;
      elements.mysticEditorLevel.append(option);
    }
  }

  function filteredServants() {
    const query = elements.search.value.trim().toLocaleLowerCase("ja");
    const className = elements.classFilter.value;
    const rarity = elements.rarityFilter.value;
    const owned = elements.ownedFilter.value;

    const filtered = servants.filter(servant => {
      const record = recordFor(servant.id);
      const searchableName = [servant.name, ...(servant.searchAliases || [])].join(" ").toLocaleLowerCase("ja");
      if (query && !searchableName.includes(query)) return false;
      if (className !== "all" && normalizedClassName(servant.className) !== className) return false;
      if (rarity !== "all" && servant.rarity !== Number(rarity)) return false;
      if (owned === "owned" && !record?.owned) return false;
      if (owned === "unowned" && record?.owned) return false;
      if (owned === "incomplete" && !isIncomplete(record)) return false;
      return true;
    });

    const collectionSort = (a, b) => a.collectionNo - b.collectionNo;
    const raritySort = (a, b) => b.rarity - a.rarity || collectionSort(a, b);
    const sorters = {
      collection: collectionSort,
      "rarity-desc": raritySort,
      "rarity-asc": (a, b) => a.rarity - b.rarity || collectionSort(a, b),
      class: (a, b) => {
        const aClass = normalizedClassName(a.className);
        const bClass = normalizedClassName(b.className);
        return (CLASS_LABELS[aClass] || aClass).localeCompare(CLASS_LABELS[bClass] || bClass, "ja") || raritySort(a, b);
      },
      name: (a, b) => a.name.localeCompare(b.name, "ja") || collectionSort(a, b),
      owned: (a, b) => Number(Boolean(recordFor(b.id)?.owned)) - Number(Boolean(recordFor(a.id)?.owned)) || raritySort(a, b)
    };
    return filtered.sort(sorters[elements.sortOrder.value] || collectionSort);
  }

  function render() {
    const filtered = filteredServants();
    const fragment = document.createDocumentFragment();

    for (const servant of filtered) {
      const record = recordFor(servant.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `servant-card${record?.owned ? " owned" : ""}`;
      card.dataset.id = String(servant.id);
      card.setAttribute("aria-label", `${servant.name}を編集`);

      const status = record?.owned
        ? `Lv.${record.level || "?"} / 宝具${record.np || "?"} / ${formatLevels(record.skills)}`
        : "";

      card.innerHTML = `
        <div class="servant-face-wrap">
          <img class="servant-face" src="${escapeAttribute(servant.face)}" alt="" loading="lazy">
          ${record?.owned ? '<span class="owned-badge">所持</span>' : ""}
        </div>
        <div class="servant-info">
          <p class="servant-name">${escapeHtml(servant.name)}</p>
          <p class="servant-meta">★${servant.rarity} ${escapeHtml(CLASS_LABELS[servant.className] || servant.className)}</p>
          ${status ? `<p class="servant-status">${escapeHtml(status)}</p>` : ""}
        </div>`;
      fragment.append(card);
    }

    elements.grid.replaceChildren(fragment);
    const filteredOwned = filtered.filter(servant => recordFor(servant.id)?.owned).length;
    const filteredSkills = filtered.filter(servant => hasCompleteSkills(recordFor(servant.id))).length;
    elements.resultCount.textContent = `該当 ${filtered.length}騎 ／ 所持 ${filteredOwned}騎 ／ スキル入力済み ${filteredSkills}騎`;
    updateSummary();
  }

  function filteredMysticCodes() {
    const query = elements.mysticSearch.value.trim().toLocaleLowerCase("ja");
    const owned = elements.mysticOwnedFilter.value;
    return mysticCodes.filter(mysticCode => {
      const record = mysticRecordFor(mysticCode.id);
      if (query && !`${mysticCode.name} ${mysticCode.shortName || ""}`.toLocaleLowerCase("ja").includes(query)) return false;
      if (owned === "owned" && !record?.owned) return false;
      if (owned === "unowned" && record?.owned) return false;
      if (owned === "incomplete" && (!record?.owned || record.level)) return false;
      return true;
    });
  }

  function renderMysticCodes() {
    const filtered = filteredMysticCodes();
    const fragment = document.createDocumentFragment();

    for (const mysticCode of filtered) {
      const record = mysticRecordFor(mysticCode.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `mystic-code-card${record?.owned ? " owned" : ""}`;
      card.dataset.id = String(mysticCode.id);
      card.setAttribute("aria-label", `${mysticCode.name}を編集`);
      const skillNames = mysticCode.skills.map(skill => skill.name).join("・");
      card.innerHTML = `
        <div class="mystic-image-wrap">
          <img class="mystic-image" src="${escapeAttribute(mysticCode.image)}" alt="" loading="lazy">
          ${record?.owned ? '<span class="owned-badge">所持</span>' : ""}
        </div>
        <div class="mystic-card-info">
          <p class="mystic-name">${escapeHtml(mysticCode.name)}</p>
          <p class="mystic-level">${record?.owned ? `Lv.${record.level || "?"}` : "未所持"}</p>
          <p class="mystic-skills">${escapeHtml(skillNames)}</p>
        </div>`;
      fragment.append(card);
    }

    elements.mysticGrid.replaceChildren(fragment);
    const filteredOwned = filtered.filter(mysticCode => mysticRecordFor(mysticCode.id)?.owned).length;
    elements.mysticResultCount.textContent = `該当 ${filtered.length}着 ／ 所持 ${filteredOwned}着`;
    updateMysticSummary();
  }

  function updateMysticSummary() {
    const records = Object.values(state.mysticCodes);
    elements.mysticOwnedCount.textContent = records.filter(record => record.owned).length;
    elements.mysticMaxCount.textContent = records.filter(record => record.owned && record.level === 10).length;
    elements.mysticTotalCount.textContent = mysticCodes.length;
  }

  function filteredCraftEssences() {
    const query = elements.ceSearch.value.trim().toLocaleLowerCase("ja");
    const category = elements.ceCategoryFilter.value;
    const rarity = elements.ceRarityFilter.value;
    const owned = elements.ceOwnedFilter.value;

    const filtered = craftEssences.filter(craftEssence => {
      const record = craftEssenceRecordFor(craftEssence.id);
      if (query && !craftEssence.name.toLocaleLowerCase("ja").includes(query)) return false;
      if (category !== "all" && craftEssenceCategory(craftEssence) !== category) return false;
      if (rarity !== "all" && craftEssence.rarity !== Number(rarity)) return false;
      if (owned === "owned" && !record?.owned) return false;
      if (owned === "unowned" && record?.owned) return false;
      if (owned === "mlb" && !(record?.owned && record.mlbCopies > 0)) return false;
      if (owned === "incomplete" && !(record?.owned && (!record.copies || !record.level))) return false;
      return true;
    });

    const collectionSort = (a, b) => a.collectionNo - b.collectionNo;
    const sorters = {
      collection: collectionSort,
      newest: (a, b) => b.collectionNo - a.collectionNo,
      rarity: (a, b) => b.rarity - a.rarity || collectionSort(a, b),
      atk: (a, b) => b.atkMax - a.atkMax || b.rarity - a.rarity || collectionSort(a, b),
      name: (a, b) => a.name.localeCompare(b.name, "ja") || collectionSort(a, b),
      owned: (a, b) => Number(Boolean(craftEssenceRecordFor(b.id)?.owned)) - Number(Boolean(craftEssenceRecordFor(a.id)?.owned)) || collectionSort(a, b)
    };
    return filtered.sort(sorters[elements.ceSortOrder.value] || collectionSort);
  }

  function renderCraftEssences() {
    const filtered = filteredCraftEssences();
    const fragment = document.createDocumentFragment();

    for (const craftEssence of filtered) {
      const record = craftEssenceRecordFor(craftEssence.id);
      const category = craftEssenceCategory(craftEssence);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `craft-essence-card${record?.owned ? " owned" : ""}`;
      card.dataset.id = String(craftEssence.id);
      card.setAttribute("aria-label", `${craftEssence.name}を編集`);
      const ownedStatus = record?.owned
        ? `${record.copies || "?"}枚 / 最大解放${record.mlbCopies || 0}枚 / Lv.${record.level || "?"}`
        : "未所持";
      card.innerHTML = `
        <div class="ce-image-wrap">
          <img class="ce-image" src="${escapeAttribute(craftEssence.face)}" alt="" loading="lazy">
          ${record?.owned ? '<span class="owned-badge">所持</span>' : ""}
        </div>
        <div class="ce-card-info">
          <p class="ce-name">${escapeHtml(craftEssence.name)}</p>
          <p class="ce-meta">No.${craftEssence.collectionNo} / ★${craftEssence.rarity} / ${escapeHtml(CE_CATEGORY_LABELS[category])}</p>
          <p class="ce-status">${escapeHtml(ownedStatus)}</p>
        </div>`;
      fragment.append(card);
    }

    elements.ceGrid.replaceChildren(fragment);
    const filteredOwned = filtered.filter(craftEssence => craftEssenceRecordFor(craftEssence.id)?.owned).length;
    elements.ceResultCount.textContent = `該当 ${filtered.length}種 ／ 所持 ${filteredOwned}種`;
    updateCraftEssenceSummary();
  }

  function updateCraftEssenceSummary() {
    const owned = craftEssences.filter(craftEssence => craftEssenceRecordFor(craftEssence.id)?.owned);
    elements.ceOwnedCount.textContent = owned.length;
    elements.ceMlbCount.textContent = owned.filter(craftEssence => craftEssenceRecordFor(craftEssence.id).mlbCopies > 0).length;
    elements.ceMaxCount.textContent = owned.filter(craftEssence => craftEssenceRecordFor(craftEssence.id).level === craftEssence.maxLv).length;
    elements.ceTotalCount.textContent = craftEssences.length;
  }

  function updateSummary() {
    const records = Object.values(state.roster);
    elements.ownedCount.textContent = records.filter(record => record.owned).length;
    elements.trainedCount.textContent = records.filter(hasCompleteSkills).length;
    elements.totalCount.textContent = servants.length;
    elements.updatedAt.textContent = state.updatedAt
      ? new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(state.updatedAt))
      : "未登録";
    updateSafetyStatus();
    updateMysticSummary();
    updateCraftEssenceSummary();
    updateInventorySummary();
  }

  function openEditor(id) {
    const servant = servants.find(item => item.id === id);
    if (!servant) return;
    currentServantId = id;
    const record = recordFor(id) || {
      owned: false, level: "", np: "", coins: "", hpEnhancement: "", atkEnhancement: "",
      skills: ["", "", ""], appends: ["", "", "", "", ""], notes: ""
    };

    elements.editorFace.src = servant.face;
    elements.editorFace.alt = servant.name;
    elements.editorName.textContent = servant.name;
    elements.editorMeta.textContent = `No.${servant.collectionNo} / ★${servant.rarity} / ${CLASS_LABELS[servant.className] || servant.className}`;
    elements.editorOwned.checked = Boolean(record.owned);
    elements.editorLevel.value = record.level || (record.owned ? maxLevelForRarity(servant.rarity) : "");
    elements.editorNp.value = record.np || (record.owned ? "1" : "");
    elements.editorCoins.value = record.coins ?? "";
    elements.editorHpEnhancement.value = record.hpEnhancement ?? "";
    elements.editorAtkEnhancement.value = record.atkEnhancement ?? "";
    elements.editorNotes.value = record.notes || "";
    skillSelects.forEach((select, index) => { select.value = record.skills?.[index] || ""; });
    appendSelects.forEach((select, index) => { select.value = record.appends?.[index] || ""; });
    toggleTrainingFields();
    elements.editor.showModal();
  }

  async function saveEditor() {
    if (currentServantId === null) return;
    if (!elements.editorOwned.checked) {
      if (!window.confirm("この1騎を所持一覧から外しますか？変更前の世代は保全されます。")) return;
      delete state.roster[String(currentServantId)];
    } else {
      state.roster[String(currentServantId)] = {
        owned: true,
        level: boundedNumberOrEmpty(elements.editorLevel.value, 1, 120),
        np: numberOrEmpty(elements.editorNp.value),
        coins: numberOrEmpty(elements.editorCoins.value),
        hpEnhancement: numberOrEmpty(elements.editorHpEnhancement.value),
        atkEnhancement: numberOrEmpty(elements.editorAtkEnhancement.value),
        skills: skillSelects.map(select => numberOrEmpty(select.value)),
        appends: appendSelects.map(select => numberOrEmpty(select.value)),
        notes: elements.editorNotes.value.trim()
      };
    }
    if (!(await saveState(elements.editorOwned.checked ? {} : {kind:"delete",allowDelete:String(currentServantId)}))) return;
    elements.editor.close();
    render();
    showToast("保存しました");
  }

  function openMysticEditor(id) {
    const mysticCode = mysticCodes.find(item => item.id === id);
    if (!mysticCode) return;
    currentMysticCodeId = id;
    const record = mysticRecordFor(id) || { owned: false, level: "" };

    elements.mysticEditorImage.src = mysticCode.image;
    elements.mysticEditorImage.alt = mysticCode.name;
    elements.mysticEditorName.textContent = mysticCode.name;
    elements.mysticEditorDetail.textContent = mysticCode.detail || "";
    elements.mysticEditorOwned.checked = Boolean(record.owned);
    elements.mysticEditorLevel.value = record.level || "";
    elements.mysticEditorSkills.replaceChildren(...mysticCode.skills.map(skill => {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(skill.detail)}</span>`;
      return item;
    }));
    toggleMysticTrainingFields();
    elements.mysticEditor.showModal();
  }

  async function saveMysticEditor() {
    if (currentMysticCodeId === null) return;
    if (!elements.mysticEditorOwned.checked) {
      delete state.mysticCodes[String(currentMysticCodeId)];
    } else {
      state.mysticCodes[String(currentMysticCodeId)] = {
        owned: true,
        level: numberOrEmpty(elements.mysticEditorLevel.value)
      };
    }
    if (!(await saveState())) return;
    elements.mysticEditor.close();
    renderMysticCodes();
    showToast("魔術礼装を保存しました");
  }

  function toggleMysticTrainingFields() {
    const enabled = elements.mysticEditorOwned.checked;
    elements.mysticEditorLevel.disabled = !enabled;
    elements.mysticTrainingFields.style.opacity = enabled ? "1" : "0.45";
  }

  function openCraftEssenceEditor(id) {
    const craftEssence = craftEssences.find(item => item.id === id);
    if (!craftEssence) return;
    currentCraftEssenceId = id;
    const record = craftEssenceRecordFor(id) || {
      owned: false, copies: "", mlbCopies: 0, level: "", notes: ""
    };
    const category = craftEssenceCategory(craftEssence);

    elements.ceEditorImage.src = craftEssence.face;
    elements.ceEditorImage.alt = craftEssence.name;
    elements.ceEditorMeta.textContent = `No.${craftEssence.collectionNo} / ★${craftEssence.rarity} / ${CE_CATEGORY_LABELS[category]}`;
    elements.ceEditorName.textContent = craftEssence.name;
    elements.ceEditorStats.textContent = `最大Lv.${craftEssence.maxLv} / 最大ATK ${craftEssence.atkMax.toLocaleString("ja-JP")} / 最大HP ${craftEssence.hpMax.toLocaleString("ja-JP")}`;
    elements.ceEditorOwned.checked = Boolean(record.owned);
    elements.ceEditorCopies.value = record.copies || (record.owned ? 1 : "");
    elements.ceEditorMlbCopies.value = record.mlbCopies ?? 0;
    elements.ceEditorLevel.max = String(craftEssence.maxLv);
    elements.ceEditorLevel.value = record.level || "";
    elements.ceEditorNotes.value = record.notes || "";
    toggleCraftEssenceTrainingFields();
    elements.ceEditor.showModal();
  }

  async function saveCraftEssenceEditor() {
    if (currentCraftEssenceId === null) return;
    if (!elements.ceEditorOwned.checked) {
      delete state.craftEssences[String(currentCraftEssenceId)];
    } else {
      const copies = boundedNumberOrEmpty(elements.ceEditorCopies.value, 1, 999) || 1;
      const mlbCopies = boundedNumberOrEmpty(elements.ceEditorMlbCopies.value, 0, 99);
      state.craftEssences[String(currentCraftEssenceId)] = {
        owned: true,
        copies,
        mlbCopies: mlbCopies === "" ? 0 : mlbCopies,
        level: boundedNumberOrEmpty(elements.ceEditorLevel.value, 1, Number(elements.ceEditorLevel.max) || 100),
        notes: elements.ceEditorNotes.value.trim()
      };
    }
    if (!(await saveState())) return;
    elements.ceEditor.close();
    renderCraftEssences();
    showToast("概念礼装を保存しました");
  }

  function toggleCraftEssenceTrainingFields() {
    const enabled = elements.ceEditorOwned.checked;
    if (enabled && !elements.ceEditorCopies.value) elements.ceEditorCopies.value = "1";
    elements.ceTrainingFields.querySelectorAll("input, textarea").forEach(field => {
      field.disabled = !enabled;
    });
    elements.ceTrainingFields.style.opacity = enabled ? "1" : "0.45";
  }

  function olgaServantLabel(servant) {
    const className = normalizedClassName(servant.className);
    return `${servant.name}（${CLASS_LABELS[className] || className}・★${servant.rarity}）`;
  }

  function olgaCraftEssenceLabel(craftEssence) {
    return `${craftEssence.name}（★${craftEssence.rarity}）`;
  }

  function emptyOlgaRecord() {
    return {
      parties: Array.from({ length: OLGA_PARTY_COUNT }, () => ({
        members: Array.from({ length: OLGA_MEMBER_COUNT }, () => ({ servant: "", craftEssence: "" })),
        result: "",
        turns: "",
        notes: ""
      })),
      overallNotes: ""
    };
  }

  function normalizeOlgaRecord(record) {
    const normalized = record && typeof record === "object" ? record : emptyOlgaRecord();
    if (!Array.isArray(normalized.parties)) normalized.parties = [];
    while (normalized.parties.length < OLGA_PARTY_COUNT) normalized.parties.push({ members: [], result: "", turns: "", notes: "" });
    normalized.parties = normalized.parties.slice(0, OLGA_PARTY_COUNT).map(party => {
      const normalizedParty = party && typeof party === "object" ? party : {};
      if (!Array.isArray(normalizedParty.members)) normalizedParty.members = [];
      while (normalizedParty.members.length < OLGA_MEMBER_COUNT) normalizedParty.members.push({ servant: "", craftEssence: "" });
      normalizedParty.members = normalizedParty.members.slice(0, OLGA_MEMBER_COUNT).map(member => ({
        servant: member?.servant || "",
        craftEssence: member?.craftEssence || ""
      }));
      normalizedParty.result = normalizedParty.result || "";
      normalizedParty.turns = normalizedParty.turns ?? "";
      normalizedParty.notes = normalizedParty.notes || "";
      return normalizedParty;
    });
    normalized.overallNotes = normalized.overallNotes || "";
    return normalized;
  }

  function currentOlgaKey() {
    return `${state.olgaMarie.selectedQuest || "1"}:${state.olgaMarie.selectedMode || "通常"}`;
  }

  function currentOlgaRecord() {
    const key = currentOlgaKey();
    state.olgaMarie.records[key] = normalizeOlgaRecord(state.olgaMarie.records[key]);
    return state.olgaMarie.records[key];
  }

  function populateOlgaOptions() {
    const ownedServants = servants.filter(servant => recordFor(servant.id)?.owned);
    const servantSource = ownedServants.length ? ownedServants : servants;
    const servantFragment = document.createDocumentFragment();
    for (const servant of servantSource) {
      const option = document.createElement("option");
      option.value = olgaServantLabel(servant);
      servantFragment.append(option);
    }
    elements.olgaServantOptions.replaceChildren(servantFragment);

    const ownedCraftEssences = craftEssences.filter(craftEssence => craftEssenceRecordFor(craftEssence.id)?.owned);
    const craftEssenceSource = ownedCraftEssences.length ? ownedCraftEssences : craftEssences;
    const craftEssenceFragment = document.createDocumentFragment();
    for (const craftEssence of craftEssenceSource) {
      const option = document.createElement("option");
      option.value = olgaCraftEssenceLabel(craftEssence);
      craftEssenceFragment.append(option);
    }
    elements.olgaCeOptions.replaceChildren(craftEssenceFragment);

    if (ownedServants.length && ownedCraftEssences.length) {
      elements.olgaSourceNote.textContent = `所持登録済みのサーヴァント${ownedServants.length}騎・概念礼装${ownedCraftEssences.length}種から選べます。入力内容はこの端末に自動保存されます。`;
    } else {
      elements.olgaSourceNote.textContent = "所持データが見つからない項目は全一覧から選べます。入力内容はこの端末に自動保存されます。";
    }
  }

  function olgaResultOptions(selected) {
    return [
      ["", "未入力"],
      ["勝利・突破", "勝利・突破"],
      ["役割達成", "役割達成"],
      ["ターン終了", "ターン終了"],
      ["全滅", "全滅"],
      ["未使用", "未使用"]
    ].map(([value, label]) => `<option value="${escapeAttribute(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
  }

  function renderOlgaMarie() {
    state.olgaMarie = state.olgaMarie || emptyOlgaMarieState();
    state.olgaMarie.records = state.olgaMarie.records || {};
    elements.olgaQuestSelect.value = state.olgaMarie.selectedQuest || "1";
    elements.olgaModeSelect.value = state.olgaMarie.selectedMode || "通常";
    populateOlgaOptions();
    const record = currentOlgaRecord();
    const fragment = document.createDocumentFragment();

    record.parties.forEach((party, partyIndex) => {
      const section = document.createElement("section");
      section.className = "olga-party-card";
      section.innerHTML = `
        <div class="olga-party-heading">
          <div><span>PARTY</span><strong>${partyIndex + 1}</strong></div>
          <label><span>結果</span><select data-olga-field="result" data-party="${partyIndex}">${olgaResultOptions(party.result)}</select></label>
          <label><span>使用ターン</span><input class="numeric-entry" data-olga-field="turns" data-party="${partyIndex}" type="text" inputmode="numeric" pattern="[0-9]*" value="${escapeAttribute(party.turns)}" placeholder="任意"></label>
        </div>
        <div class="olga-members">
          ${party.members.map((member, memberIndex) => `
            <div class="olga-member-row">
              <span class="olga-member-number">${memberIndex + 1}</span>
              <label><span>サーヴァント</span><input data-olga-field="servant" data-party="${partyIndex}" data-member="${memberIndex}" list="olga-servant-options" value="${escapeAttribute(member.servant)}" placeholder="名前を入力・選択"></label>
              <label><span>概念礼装</span><input data-olga-field="craftEssence" data-party="${partyIndex}" data-member="${memberIndex}" list="olga-ce-options" value="${escapeAttribute(member.craftEssence)}" placeholder="礼装を入力・選択"></label>
            </div>`).join("")}
        </div>
        <label class="olga-party-notes"><span>このパーティのメモ</span><textarea data-olga-field="notes" data-party="${partyIndex}" rows="2" placeholder="敵、役割、失敗理由など">${escapeHtml(party.notes)}</textarea></label>`;
      fragment.append(section);
    });

    elements.olgaPartyList.replaceChildren(fragment);
    elements.olgaOverallNotes.value = record.overallNotes;
    updateOlgaSummaryAndExport();
  }

  function collectOlgaWarnings(record) {
    const warnings = [];
    const servantCounts = new Map();
    const craftEssenceCounts = new Map();
    for (const party of record.parties) {
      for (const member of party.members) {
        const servant = member.servant.trim();
        const craftEssence = member.craftEssence.trim();
        if (servant) servantCounts.set(servant, (servantCounts.get(servant) || 0) + 1);
        if (craftEssence) craftEssenceCounts.set(craftEssence, (craftEssenceCounts.get(craftEssence) || 0) + 1);
      }
    }
    for (const [name, count] of servantCounts) {
      if (count > 1) warnings.push(`サーヴァント重複: ${name} ×${count}`);
    }
    for (const [label, count] of craftEssenceCounts) {
      if (count < 2) continue;
      const craftEssence = craftEssences.find(item => olgaCraftEssenceLabel(item) === label);
      const copies = craftEssence ? Number(craftEssenceRecordFor(craftEssence.id)?.copies || 0) : 0;
      if (copies && count > copies) warnings.push(`概念礼装の所持枚数超過: ${label}（使用${count}・所持${copies}）`);
      if (!copies) warnings.push(`概念礼装の複数使用を確認: ${label} ×${count}`);
    }
    return warnings;
  }

  function formatOlgaServantForExport(label) {
    if (!label) return "未入力";
    const servant = servants.find(item => olgaServantLabel(item) === label);
    if (!servant) return label;
    const record = recordFor(servant.id);
    if (!record?.owned) return label;
    return `${label}［Lv.${record.level || "?"}・宝具${record.np || "?"}・スキル${formatLevels(record.skills)}］`;
  }

  function formatOlgaCraftEssenceForExport(label) {
    if (!label) return "未入力";
    const craftEssence = craftEssences.find(item => olgaCraftEssenceLabel(item) === label);
    if (!craftEssence) return label;
    const record = craftEssenceRecordFor(craftEssence.id);
    if (!record?.owned) return label;
    return `${label}［最大解放${record.mlbCopies || 0}枚・最高Lv.${record.level || "?"}］`;
  }

  function createOlgaExport() {
    const record = currentOlgaRecord();
    const warnings = collectOlgaWarnings(record);
    const lines = [
      "# FGO オルガマリークエスト使用編成",
      "",
      `- クエスト: オルガマリークエスト ${state.olgaMarie.selectedQuest}`,
      `- 難易度・挑戦: ${state.olgaMarie.selectedMode}`,
      `- 出力日時: ${new Date().toLocaleString("ja-JP")}`,
      ""
    ];
    record.parties.forEach((party, partyIndex) => {
      lines.push(`## パーティ ${partyIndex + 1}`, "");
      party.members.forEach((member, memberIndex) => {
        lines.push(`${memberIndex + 1}. ${formatOlgaServantForExport(member.servant)} / 礼装: ${formatOlgaCraftEssenceForExport(member.craftEssence)}`);
      });
      if (party.result) lines.push(`- 結果: ${party.result}`);
      if (party.turns !== "") lines.push(`- 使用ターン: ${party.turns}`);
      if (party.notes.trim()) lines.push(`- メモ: ${party.notes.trim().replaceAll("\n", " / ")}`);
      lines.push("");
    });
    if (record.overallNotes.trim()) lines.push("## 全体メモ", "", record.overallNotes.trim(), "");
    if (warnings.length) lines.push("## 入力確認", "", ...warnings.map(warning => `- ${warning}`), "");
    lines.push("## 相談したいこと", "", "この編成を見て、改善できるパーティと礼装の入れ替え候補を教えてください。");
    return lines.join("\n");
  }

  function updateOlgaSummaryAndExport() {
    const record = currentOlgaRecord();
    const partiesEntered = record.parties.filter(party => party.members.some(member => member.servant || member.craftEssence)).length;
    const servantsEntered = record.parties.flatMap(party => party.members).filter(member => member.servant).length;
    const craftEssencesEntered = record.parties.flatMap(party => party.members).filter(member => member.craftEssence).length;
    const warnings = collectOlgaWarnings(record);
    elements.olgaPartyCount.textContent = `${partiesEntered} / ${OLGA_PARTY_COUNT}`;
    elements.olgaServantCount.textContent = `${servantsEntered} / ${OLGA_PARTY_COUNT * OLGA_MEMBER_COUNT}`;
    elements.olgaCeCount.textContent = `${craftEssencesEntered} / ${OLGA_PARTY_COUNT * OLGA_MEMBER_COUNT}`;
    elements.olgaDuplicateSummary.textContent = warnings.length ? "要確認" : "問題なし";
    elements.olgaDuplicateSummary.classList.toggle("warning-text", Boolean(warnings.length));
    elements.olgaDuplicateWarning.hidden = !warnings.length;
    elements.olgaDuplicateWarning.innerHTML = warnings.length ? `<strong>入力を確認してください</strong><ul>${warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : "";
    elements.olgaExportPreview.value = createOlgaExport();
  }

  async function saveOlgaField(target) {
    const record = currentOlgaRecord();
    const partyIndex = Number(target.dataset.party);
    const memberIndex = target.dataset.member === undefined ? null : Number(target.dataset.member);
    const field = target.dataset.olgaField;
    if (!Number.isInteger(partyIndex) || !record.parties[partyIndex] || !field) return;
    if (memberIndex !== null && record.parties[partyIndex].members[memberIndex]) {
      record.parties[partyIndex].members[memberIndex][field] = target.value;
    } else if (field === "turns") {
      target.value = normalizeDigits(target.value).replace(/[^0-9]/g, "");
      record.parties[partyIndex][field] = target.value;
    } else {
      record.parties[partyIndex][field] = target.value;
    }
    if (!(await saveState())) return;
    updateOlgaSummaryAndExport();
  }

  function switchView(view) {
    const showMysticCodes = view === "mystic-codes";
    const showCraftEssences = view === "craft-essences";
    const showOlgaMarie = view === "olga-marie";
    elements.servantView.hidden = showMysticCodes || showCraftEssences || view === "inventory" || showOlgaMarie;
    elements.mysticCodeView.hidden = !showMysticCodes;
    elements.craftEssenceView.hidden = !showCraftEssences;
    elements.inventoryView.hidden = view !== "inventory";
    elements.olgaMarieView.hidden = !showOlgaMarie;
    for (const tab of elements.viewTabs) {
      const active = tab.dataset.view === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    }
    if (showMysticCodes) renderMysticCodes();
    if (showCraftEssences) renderCraftEssences();
    if (view === "inventory") renderInventory();
    if (showOlgaMarie) renderOlgaMarie();
  }

  function toggleTrainingFields() {
    const enabled = elements.editorOwned.checked;
    if (enabled && !elements.editorLevel.value) {
      const servant = servants.find(item => item.id === currentServantId);
      if (servant) elements.editorLevel.value = String(maxLevelForRarity(servant.rarity));
    }
    if (enabled && !elements.editorNp.value) elements.editorNp.value = "1";
    elements.trainingFields.querySelectorAll("input, select, textarea, button").forEach(field => {
      field.disabled = !enabled;
    });
    elements.trainingFields.style.opacity = enabled ? "1" : "0.45";
  }

  function createAiExport() {
    const owned = servants.filter(servant => recordFor(servant.id)?.owned);
    const lines = [
      "# FGO 所持・育成データ（AI攻略相談用）",
      "",
      `- 出力日時: ${new Date().toLocaleString("ja-JP")}`,
      `- 所持数: ${owned.length} / ${servants.length}`,
      "- 空欄または ? は未入力",
      ""
    ];

    const groups = new Map();
    for (const servant of owned) {
      const className = normalizedClassName(servant.className);
      if (!groups.has(className)) groups.set(className, []);
      groups.get(className).push(servant);
    }

    for (const [className, group] of groups) {
      lines.push(`## ${CLASS_LABELS[className] || className}`, "");
      for (const servant of group) {
        const record = recordFor(servant.id);
        const append = record.appends?.some(Boolean) ? formatLevels(record.appends) : "未入力";
        let line = `- ${servant.name}（★${servant.rarity}）: Lv.${record.level || "?"}, 宝具${record.np || "?"}, スキル ${formatLevels(record.skills)}, アペンド ${append}`;
        line += `, コイン ${record.coins ?? "未入力"}, HP強化 ${record.hpEnhancement ?? "未入力"}, ATK強化 ${record.atkEnhancement ?? "未入力"}`;
        if (record.notes) line += `, メモ: ${record.notes.replaceAll("\n", " ")}`;
        lines.push(line);
      }
      lines.push("");
    }

    if (!owned.length) lines.push("所持サーヴァントはまだ登録されていません。", "");
    const ownedMysticCodes = mysticCodes.filter(mysticCode => mysticRecordFor(mysticCode.id)?.owned);
    lines.push("## 魔術礼装", "");
    if (ownedMysticCodes.length) {
      for (const mysticCode of ownedMysticCodes) {
        const record = mysticRecordFor(mysticCode.id);
        lines.push(`- ${mysticCode.name}: Lv.${record.level || "?"}`);
      }
      lines.push("");
    } else {
      lines.push("所持魔術礼装はまだ登録されていません。", "");
    }
    const ownedCraftEssences = craftEssences.filter(craftEssence => craftEssenceRecordFor(craftEssence.id)?.owned);
    lines.push("## 概念礼装", "");
    if (ownedCraftEssences.length) {
      for (const craftEssence of ownedCraftEssences) {
        const record = craftEssenceRecordFor(craftEssence.id);
        let line = `- ${craftEssence.name}（★${craftEssence.rarity}）: ${record.copies || "?"}枚, 最大解放${record.mlbCopies || 0}枚, 最高Lv.${record.level || "?"}, 最大ATK ${craftEssence.atkMax}`;
        if (record.notes) line += `, メモ: ${record.notes.replaceAll("\n", " ")}`;
        lines.push(line);
      }
      lines.push("");
    } else {
      lines.push("所持概念礼装はまだ登録されていません。", "");
    }
    lines.push("## 素材・資源", "");
    const inventoryEntries = RESOURCE_GROUPS
      .flatMap(group => group.fields)
      .map(([key, label]) => [key, label, state.inventory?.[key]])
      .filter(([, , value]) => value !== "" && value !== null && value !== undefined);
    if (inventoryEntries.length) {
      for (const [, label, value] of inventoryEntries) lines.push(`- ${label}: ${Number(value).toLocaleString("ja-JP")}`);
      if (state.inventory.customNotes?.trim()) lines.push(`- その他・新素材メモ: ${state.inventory.customNotes.trim().replaceAll("\n", " / ")}`);
      lines.push("");
    } else {
      lines.push("素材・資源はまだ登録されていません。", "");
    }
    lines.push("## 攻略相談", "", "クエスト名: ", "困っている点: ");
    return lines.join("\n");
  }

  function backup() {
    try {
      const payload=safeStore.exportPayload();
      const revision=safeStore.load().revision;
      downloadFile(`my-chaldea-${dateStamp()}.json`,JSON.stringify(payload,null,2),"application/json");
      try {localStorage.setItem(STORAGE_KEY+"-export-receipt",JSON.stringify({revision,at:new Date().toISOString()}));}
      catch(_error){showToast("JSONは出力しましたが出力日時を記録できませんでした");}
      updateSafetyStatus();
      showToast("JSONを出力しました。ブラウザの保存先を確認してください");
    } catch(error){showToast(error.message);}
  }

  function updateSafetyStatus() {
    let panel=document.querySelector("#safety-panel");
    if(!panel){panel=document.createElement("section");panel.id="safety-panel";panel.setAttribute("aria-label","保存とバックアップ");document.body.prepend(panel);}
    panel.replaceChildren();
    document.querySelectorAll(".dialog-safety-stop").forEach(el=>el.remove());
    const add=(tag,text,parent=panel)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
    let saved=null;
    try {saved=safeStore.load();}catch(error){storageBlocked=true;storageProblem=error.message;}
    if(!navigator.locks){storageBlocked=true;storageProblem="このブラウザは安全な排他保存に対応していません";}
    if(storageBlocked){const alert=add("div","");alert.className="persistent-save-stop";alert.setAttribute("role","alert");add("strong","保存を停止しました",alert);add("p",storageProblem+"。再読込して最新状態を確認してください。未保存の入力は失われます。",alert);const btn=add("button","最新状態を再読込",alert);btn.onclick=()=>{if(window.confirm("未保存の入力を破棄して最新の保存状態を読み込みますか？"))location.reload();};}
    if(storageBlocked)document.querySelectorAll("dialog[open]").forEach(dialog=>{
      const warning=document.createElement("div");warning.className="dialog-safety-stop";warning.setAttribute("role","alert");warning.textContent="保存を停止しました："+storageProblem+"。ページを再読込して最新状態を確認してください。";dialog.prepend(warning);
    });
    const receiptKey=STORAGE_KEY+"-export-receipt";
    let receipt=null;try{receipt=JSON.parse(localStorage.getItem(receiptKey)||"null");}catch(_error){}
    const current=!!saved&&receipt?.revision===saved.revision;
    const status=!saved?"まだ保存データがありません":current?"現在の保存データはJSON出力済み（ファイルの保存先を確認してください）":"現在の保存データはJSON未出力です";
    elements.backupStatus.textContent=status;
    elements.backupStatus.className="backup-status "+(current?"backup-status-done":"backup-status-pending");
    add("p",(storageBlocked?"保存停止中":"保存可能")+" ／ 保存番号 "+(saved?.revision||0)+" ／ "+status);
    add("p","最終JSON出力："+(receipt?.at||"記録なし")+"。出力済みはダウンロード開始の記録です。保存完了を保証しません。");
    add("p","このブラウザ専用の保存です。SafariとChromeは自動同期しません。普段は1つのブラウザで利用してください。");
    const details=add("details","");add("summary","自動世代バックアップを確認（このブラウザ内・外部JSONとは別）",details);
    const entries=[...(saved?.history||[]).map(x=>["直近",x]),...(saved?.beforeImport?[["取込前",saved.beforeImport]]:[]),...(saved?.beforeLargeChange?[["大量変更前",saved.beforeLargeChange]]:[])];
    add("p",`保全枠 ${entries.length}件（直近${saved?.history?.length||0}/5、取込前${saved?.beforeImport?1:0}/1、大量変更前${saved?.beforeLargeChange?1:0}/1）。同じ世代が複数枠に入る場合があります。`,details);
    for(const [kind,x] of entries)add("p",`${kind} ／ 保存番号 ${x.revision} ／ ${x.savedAt} ／ ${x.count}騎`,details);
    add("p","一覧表示のみです。ブラウザのデータ消去では失われるため、別途JSONを保存してください。",details);
  }

  async function restore(file) {
    try {
      const proposed=safeStore.parseImport(await file.text());
      const saved=safeStore.load();
      const before=saved?safeStore.summary(saved.data):{count:0};
      const after=safeStore.summary(proposed);
      if(saved){
        const delta=safeStore.diff(saved.data,proposed);
        if(delta.missing.length){
          storageBlocked=true;
          storageProblem=`現在${before.count}騎 → 読込データ${after.count}騎。${delta.missing.length}騎が消失するため読み込みを拒否しました。クラス別：${JSON.stringify(delta.classLoss)}`;
          updateSafetyStatus();return;
        }
      }
      if(!window.confirm(`このサイトの保存領域へ取込：${before.count}騎 → ${after.count}騎\nクラス：${JSON.stringify(after.classes)}\n変更前の状態は自動保全します。`))return;
      state=proposed;
      if(!(await saveState({kind:"import"})))return;
      render();renderMysticCodes();renderCraftEssences();renderInventory();renderOlgaMarie();showToast("隔離環境に復元しました");
    } catch(error){storageBlocked=true;storageProblem="取込を停止しました: "+error.message;updateSafetyStatus();}
    finally{elements.restoreInput.value="";}
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
  }

  function formatLevels(levels) {
    return (levels || ["", "", ""]).map(value => value || "?").join("/");
  }

  function numberOrEmpty(value) {
    const normalized = normalizeDigits(value).replace(/[^0-9]/g, "");
    return normalized === "" ? "" : Number(normalized);
  }

  function boundedNumberOrEmpty(value, min, max) {
    const number = numberOrEmpty(value);
    return number === "" ? "" : Math.min(max, Math.max(min, number));
  }

  function normalizeDigits(value) {
    return String(value).replace(/[０-９]/g, character => String.fromCharCode(character.charCodeAt(0) - 0xfee0));
  }

  function maxLevelForRarity(rarity) {
    return ({ 5: 90, 4: 80, 3: 70, 2: 65, 1: 60, 0: 65 })[rarity] || 1;
  }

  function dateStamp() {
    const date = new Date();
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  for (const element of [elements.search, elements.classFilter, elements.rarityFilter, elements.ownedFilter, elements.sortOrder]) {
    element.addEventListener(element.tagName === "INPUT" ? "input" : "change", render);
  }
  elements.grid.addEventListener("click", async event => {
    const card = event.target.closest(".servant-card");
    if (card) openEditor(Number(card.dataset.id));
  });
  elements.viewTabs.forEach(tab => tab.addEventListener("click", async () => switchView(tab.dataset.view)));
  elements.mysticSearch.addEventListener("input", renderMysticCodes);
  elements.mysticOwnedFilter.addEventListener("change", renderMysticCodes);
  elements.mysticGrid.addEventListener("click", async event => {
    const card = event.target.closest(".mystic-code-card");
    if (card) openMysticEditor(Number(card.dataset.id));
  });
  for (const element of [elements.ceSearch, elements.ceCategoryFilter, elements.ceRarityFilter, elements.ceOwnedFilter, elements.ceSortOrder]) {
    element.addEventListener(element.tagName === "INPUT" ? "input" : "change", renderCraftEssences);
  }
  elements.ceGrid.addEventListener("click", async event => {
    const card = event.target.closest(".craft-essence-card");
    if (card) openCraftEssenceEditor(Number(card.dataset.id));
  });
  elements.inventoryGroups.addEventListener("change", async event => {
    const input = event.target.closest("input[data-inventory-key]");
    if (input) saveInventoryField(input.dataset.inventoryKey, input.value);
  });
  elements.inventoryGroups.addEventListener("input", async event => {
    const numericInput = event.target.closest("input[data-inventory-key]");
    if (numericInput) numericInput.value = normalizeDigits(numericInput.value).replace(/[^0-9]/g, "");
    if (event.target.id === "inventory-custom-notes") {
      state.inventory.customNotes = event.target.value;
      if (!(await saveState())) return;
    }
  });
  elements.olgaQuestSelect.addEventListener("change", async () => {
    state.olgaMarie.selectedQuest = elements.olgaQuestSelect.value;
    if (!(await saveState())) return;
    renderOlgaMarie();
  });
  elements.olgaModeSelect.addEventListener("change", async () => {
    state.olgaMarie.selectedMode = elements.olgaModeSelect.value;
    if (!(await saveState())) return;
    renderOlgaMarie();
  });
  elements.olgaPartyList.addEventListener("input", async event => {
    const target = event.target.closest("[data-olga-field]");
    if (target) saveOlgaField(target);
  });
  elements.olgaPartyList.addEventListener("change", async event => {
    const target = event.target.closest("select[data-olga-field]");
    if (target) saveOlgaField(target);
  });
  elements.olgaOverallNotes.addEventListener("input", async () => {
    currentOlgaRecord().overallNotes = elements.olgaOverallNotes.value;
    if (!(await saveState())) return;
    updateOlgaSummaryAndExport();
  });
  document.querySelector("#olga-clear-button").addEventListener("click", async () => {
    if (!window.confirm("現在表示しているオルガマリークエストの記録を空にしますか？")) return;
    state.olgaMarie.records[currentOlgaKey()] = emptyOlgaRecord();
    if (!(await saveState())) return;
    renderOlgaMarie();
    showToast("この記録を空にしました");
  });
  document.querySelector("#olga-copy-button").addEventListener("click", async () => {
    const content = createOlgaExport();
    try {
      await navigator.clipboard.writeText(content);
    } catch (_error) {
      elements.olgaExportPreview.value = content;
      elements.olgaExportPreview.select();
      document.execCommand("copy");
    }
    showToast("オルガマリー編成をコピーしました");
  });
  document.querySelector("#olga-download-button").addEventListener("click", async () => {
    const mode = state.olgaMarie.selectedMode.replace(/[^\p{L}\p{N}]+/gu, "-");
    downloadFile(`olga-marie-${state.olgaMarie.selectedQuest}-${mode}-${dateStamp()}.md`, createOlgaExport(), "text/markdown");
  });
  elements.editorForm.addEventListener("input", async event => {
    const numericInput = event.target.closest(".numeric-entry");
    if (numericInput) numericInput.value = normalizeDigits(numericInput.value).replace(/[^0-9]/g, "");
  });
  elements.ceEditorForm.addEventListener("input", async event => {
    const numericInput = event.target.closest(".numeric-entry");
    if (numericInput) numericInput.value = normalizeDigits(numericInput.value).replace(/[^0-9]/g, "");
  });
  elements.editorOwned.addEventListener("change", toggleTrainingFields);
  elements.editorForm.addEventListener("submit", async event => { event.preventDefault(); saveEditor(); });
  document.querySelector("#editor-close").addEventListener("click", async () => elements.editor.close());
  document.querySelector("#editor-cancel").addEventListener("click", async () => elements.editor.close());
  elements.mysticEditorOwned.addEventListener("change", toggleMysticTrainingFields);
  elements.mysticEditorForm.addEventListener("submit", async event => { event.preventDefault(); saveMysticEditor(); });
  document.querySelector("#mystic-editor-close").addEventListener("click", async () => elements.mysticEditor.close());
  document.querySelector("#mystic-editor-cancel").addEventListener("click", async () => elements.mysticEditor.close());
  elements.ceEditorOwned.addEventListener("change", toggleCraftEssenceTrainingFields);
  elements.ceEditorForm.addEventListener("submit", async event => { event.preventDefault(); saveCraftEssenceEditor(); });
  document.querySelector("#ce-editor-close").addEventListener("click", async () => elements.ceEditor.close());
  document.querySelector("#ce-editor-cancel").addEventListener("click", async () => elements.ceEditor.close());
  document.querySelectorAll("[data-skill-preset]").forEach(button => {
    button.addEventListener("click", async () => skillSelects.forEach(select => { select.value = button.dataset.skillPreset; }));
  });
  document.querySelector("#export-ai-button").addEventListener("click", async () => {
    elements.exportText.value = createAiExport();
    elements.exportDialog.showModal();
  });
  document.querySelector("#export-close").addEventListener("click", async () => elements.exportDialog.close());
  document.querySelector("#copy-ai-button").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(elements.exportText.value);
      showToast("コピーしました");
    } catch (_error) {
      elements.exportText.select();
      document.execCommand("copy");
      showToast("コピーしました");
    }
  });
  document.querySelector("#download-ai-button").addEventListener("click", async () => {
    downloadFile(`fgo-roster-for-ai-${dateStamp()}.md`, elements.exportText.value, "text/markdown");
  });
  document.querySelector("#backup-button").addEventListener("click", backup);
  elements.restoreInput.addEventListener("change", async () => {
    if (elements.restoreInput.files?.[0]) restore(elements.restoreInput.files[0]);
  });

  window.addEventListener("storage", event => {
    if(event.key!==STORAGE_KEY)return;
    // Do not adopt the new revision while an editor still contains old values.
    storageBlocked=true;storageProblem="別タブで変更されました。画面を再読込してください";
    showToast(storageProblem);updateSafetyStatus();
  });

  if(storageBlocked) showToast(storageProblem+"。保存せずデータを確認してください");
  populateSelectors();
  render();
  renderMysticCodes();
  updateCraftEssenceSummary();
  renderOlgaMarie();
})();
