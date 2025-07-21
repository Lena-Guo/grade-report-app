/*
班級卡片生成、平均計算、前三名卡片更新功能

✅ 注意事項
- 確保 data/topThree.json 路徑正確，且檔案格式為 UTF-8
- 使用 Live Server 或本地伺服器開啟 index.html，才能正常使用 fetch()
- 如果資料結構錯誤或選單值不一致，會顯示「尚無資料」

🧪 測試建議
- 開啟 Live Server
- 選擇不同班級與月份
- 檢查三張卡片是否即時更新內容
- 在 topThree.json 裡新增資料 → 重新整理頁面 → 檢查更新效果
*/

let topThreeData = {};

//用localStorage讀取成績資料
const raw = localStorage.getItem("gradeData");
if (!raw) {
  console.warn("沒有找到儲存的資料");
}
const gradeData = raw ? JSON.parse(raw) : {};
//用localStorage儲存成績資料
localStorage.setItem("gradeData", JSON.stringify(gradeData));

// ✅ 更新卡片內容
function updateTopThree() {
  const classSelect = document.getElementById("classSelect").value;
  const monthSelect = document.getElementById("monthSelect").value;
  const data = topThreeData[classSelect]?.[monthSelect];

  if (!data) {
    console.warn("找不到對應的資料");
    return;
  }

  const cards = document.querySelectorAll(".subject-card");
  cards.forEach(card => {
    const subject = card.querySelector("h3").textContent;
    const list = card.querySelector("ol");
    list.innerHTML = "";

    if (data[subject]) {
      data[subject].forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "尚無資料";
      list.appendChild(li);
    }
  });
}

function importClassList() {
  const fileInput = document.getElementById("classExcelInput");
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const className = file.name.replace(".xlsx", "");
    const studentList = rows.map(row => row["學生姓名"]);

    const existingData = JSON.parse(localStorage.getItem("gradeData") || "{}");
    existingData[className] = existingData[className] || {};
    existingData[className]["學生名單"] = studentList;
    existingData[className]["成績"] = existingData[className]["成績"] || [];

    localStorage.setItem("gradeData", JSON.stringify(existingData));
    alert(`${className} 匯入成功！`);
    renderClassCards(); // 更新首頁卡片
  };

  reader.readAsArrayBuffer(file);
}

function openGradeEntry(className) {
  // 切換到成績輸入頁，並記錄目前班級
  sessionStorage.setItem("currentClass", className);
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("grade-entry").classList.add("active");
  loadStudentList(className);
}

//根據儲存的班級資料自動生成卡片
function renderClassCards() {
  const subjectWeights = JSON.parse(localStorage.getItem("subjectWeights") || "{}");
  const container = document.getElementById("classCardsContainer");
  container.innerHTML = "";

  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const classNames = Object.keys(data);

  if (classNames.length === 0) {
    const message = document.createElement("p");
    message.textContent = "目前尚未匯入任何班級名單。請前往『成績輸入』頁匯入班級資料。";
    message.className = "empty-message";
    container.appendChild(message);
    return;
  }

  classNames.slice(0, 8).forEach(className => {
    const card = document.createElement("div");
    card.className = "class-card";

    card.addEventListener("click", () => {
      const scores = data[className]["成績"] || [];
      const allDates = scores.map(r => r["上傳時間"]);
      const latestMonth = allDates.length ? allDates.map(d => d.slice(0, 7)).sort().pop() : "";

      if (latestMonth) {
        renderMonthlySummary(className, latestMonth);
        renderTopThreeFromStorage(className, latestMonth);
      }
    });

    document.querySelectorAll(".class-card").forEach(c => c.classList.remove("clicked"));
    card.classList.add("clicked");

    const title = document.createElement("h3");
    title.textContent = className;
    card.appendChild(title);

    const scores = data[className]["成績"] || [];
    const lastDate = scores.length ? scores[scores.length - 1]["上傳時間"] : "尚無更新";

    const summary = document.createElement("p");
    summary.textContent = scores.length
      ? `已有 ${scores.length} 筆成績，上次更新：${lastDate}`
      : "尚未儲存任何成績";
    card.appendChild(summary);

    // 📆 雙層選單：年份 + 月份
    const allDates = scores.map(r => r["上傳時間"]);
    const years = Array.from(new Set(allDates.map(d => d.slice(0, 4)))).sort();
    const yearSelect = document.createElement("select");
    const monthSelect = document.createElement("select");

    yearSelect.className = "pretty-select";
    monthSelect.className = "pretty-select";

    years.forEach(year => {
      const opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      yearSelect.appendChild(opt);
    });

    function updateMonthOptions(selectedYear) {
      const matchedMonths = allDates
        .filter(d => d.startsWith(selectedYear))
        .map(d => d.slice(0, 7));
      const uniqueMonths = Array.from(new Set(matchedMonths)).sort();
      monthSelect.innerHTML = "";
      uniqueMonths.forEach(month => {
        const opt = document.createElement("option");
        opt.value = month;
        opt.textContent = month;
        monthSelect.appendChild(opt);
      });
      if (uniqueMonths.length > 0) {
        monthSelect.value = uniqueMonths[0];
      }
    }

    // ⏳ 初始化月份選單
    updateMonthOptions(years[0]);

    yearSelect.onchange = () => updateMonthOptions(yearSelect.value);
    [yearSelect, monthSelect].forEach(select => {
      select.onchange = () => {
        renderMonthlySummary(className, monthSelect.value);
        renderTopThreeFromStorage(className, monthSelect.value);
      };
    });

    const dateBox = document.createElement("div");
    dateBox.className = "date-box";
    dateBox.appendChild(yearSelect);
    dateBox.appendChild(monthSelect);
    card.appendChild(dateBox);

    // 🎯 編輯成績按鈕
    const btn = document.createElement("button");
    btn.className = "pretty-button";
    btn.textContent = "編輯成績";
    btn.onclick = () => {
      openGradeEntry(className);
      renderMonthlySummary(className, monthSelect.value);
      renderTopThreeFromStorage(className, monthSelect.value);
    };
    card.appendChild(btn);

    // 📊 班級平均計算
    const scoreMap = {};
    scores.forEach(r => {
      const { 學生, 科目, 科目類型, 分數 } = r;
      const weight = subjectWeights[科目]?.[科目類型] || 0;
      if (!scoreMap[學生]) scoreMap[學生] = { total: 0, weight: 0 };
      scoreMap[學生].total += 分數 * (weight / 100);
      scoreMap[學生].weight += weight / 100;
    });
    const averages = Object.values(scoreMap)
      .map(obj => obj.weight ? obj.total / obj.weight : 0);
    const classAvg = averages.length
      ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(2)
      : "尚無資料";

    const avgDisplay = document.createElement("p");
    avgDisplay.textContent = `本月平均：${classAvg}`;
    card.appendChild(avgDisplay);

    container.appendChild(card);
  });
}

function renderTopThreeFromStorage(className, month) {
  const rawData = localStorage.getItem("gradeData");
  if (!rawData || !className) return;

  const gradeData = JSON.parse(rawData);
  const classInfo = gradeData[className];
  if (!classInfo || !classInfo["成績"]) return;

  const subjects = ["聽力與口說", "KK音標", "閱讀"];
  const container = document.querySelector(".top-three-container");
  container.innerHTML = "";

  subjects.forEach(subject => {
    const scores = {};

    classInfo["成績"].forEach(entry => {
      if (entry["科目"] === subject && entry["上傳時間"].includes(month)) {
        const name = entry["學生"];
        scores[name] = scores[name] || [];
        scores[name].push(entry["分數"]);
      }
    });

    const result = Object.entries(scores).map(([name, scoreList]) => {
      const total = scoreList.reduce((sum, val) => sum + val, 0);
      const avg = total / scoreList.length;
      return { name, score: avg, details: scoreList };
    }).sort((a, b) => b.score - a.score);

    const top3 = result.slice(0, 3);

    const card = document.createElement("div");
    card.className = "subject-card";

    const title = document.createElement("h3");
    title.textContent = subject;
    card.appendChild(title);

    const list = document.createElement("ol");

    top3.forEach((item, index) => {
      const li = document.createElement("li");
      const medal = ["🥇 第一名", "🥈 第二名", "🥉 第三名"][index];
      li.textContent = `${medal}｜${item.name} - ${item.score.toFixed(1)} 分`;

      // hover 提示：顯示各次成績
      li.title = `各次成績：${item.details.join(", ")}`;
      list.appendChild(li);
    });

    if (top3.length === 0) {
      const li = document.createElement("li");
      li.textContent = "尚無資料";
      list.appendChild(li);
    }

    card.appendChild(list);
    container.appendChild(card);
  });
}

function renderMonthlySummary(className, selectedMonth) {
  const container = document.getElementById("monthlySummaryContainer");
  container.innerHTML = "";

  const heading = document.createElement("h3");
  heading.textContent = `📘 正在查看：${className}｜${selectedMonth}`;
  heading.className = "summary-heading";
  container.appendChild(heading);
    const sortButton = document.createElement("button");
    sortButton.textContent = "🔽 依加權平均排序";
    sortButton.className = "sort-button";
    container.appendChild(sortButton);

  const data = JSON.parse(localStorage.getItem("gradeData") || "{}");
  const subjectWeights = JSON.parse(localStorage.getItem("subjectWeights") || "{}");
  const records = data[className]?.["成績"] || [];

  const filtered = records.filter(r =>
    r["上傳時間"].includes(selectedMonth)
  );

  if (filtered.length === 0) {
    const message = document.createElement("p");
    message.textContent = "本月份尚無任何成績資料。";
    message.className = "empty-month-message";
    container.appendChild(message);
    return;
  }

  const scores = {};
  filtered.forEach(r => {
    const { 學生, 科目, 科目類型, 分數 } = r;
    const weight = subjectWeights[科目]?.[科目類型] || 0;

    if (!scores[學生]) scores[學生] = { total: 0, weightSum: 0 };
    scores[學生].total += 分數 * (weight / 100);
    scores[學生].weightSum += weight / 100;
  });

  const result = Object.entries(scores).map(([name, obj]) => {
    const avg = obj.weightSum ? (obj.total / obj.weightSum).toFixed(2) : "尚無資料";
    return { name, average: avg };
  });

function renderTable(sortedData) {
  table.innerHTML = `
    <thead>
      <tr>
        <th>學生</th>
        <th>加權平均</th>
      </tr>
    </thead>
    <tbody>
      ${sortedData.map(r => {
        const percent = r.average === "尚無資料" ? 0 : Math.min(100, Math.round(r.average));
        return `
          <tr>
            <td>${r.name}</td>
            <td>
              ${r.average}
              <div class="score-bar">
                <div class="fill" style="width:${percent}%"></div>
              </div>
            </td>
          </tr>
        `;
      }).join("")}
    </tbody>
  `;
}

  // 📊 顯示加權平均總表格
  const table = document.createElement("table");
  table.className = "monthly-table";
  container.appendChild(table);
  renderTable(result);

  let descending = false;
  sortButton.addEventListener("click", () => {
    descending = !descending;
    const sorted = [...result].sort((a, b) => {
      if (a.average === "尚無資料") return 1;
      if (b.average === "尚無資料") return -1;
      return descending ? b.average - a.average : a.average - b.average;
    });
    sortButton.textContent = descending
      ? "🔼 依加權平均排序（高→低）"
      : "🔽 依加權平均排序（低→高）";
    renderTable(sorted);
  });
}

// ✅ 匯出完整備份（成績＋科目設定）
document.getElementById("exportFullDataBtn").onclick = () => {
  const gradeData = localStorage.getItem("gradeData");
  const subjectWeights = localStorage.getItem("subjectWeights");

  if (!gradeData || !subjectWeights) {
    alert("⚠️ 尚未儲存任何成績或科目資料！");
    return;
  }

  const fullBackup = {
    gradeData: JSON.parse(gradeData),
    subjectWeights: JSON.parse(subjectWeights)
  };

  const blob = new Blob([JSON.stringify(fullBackup)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "報表系統備份.json";
  link.click();
};

// 📂 開啟匯入檔案選擇
document.getElementById("importFullDataBtn").onclick = () => {
  document.getElementById("importFullDataInput").click();
};

// ✅ 匯入完整備份（還原兩個 localStorage）
document.getElementById("importFullDataInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const imported = JSON.parse(event.target.result);

      if (!imported.gradeData || !imported.subjectWeights) {
        throw new Error("備份結構不正確");
      }

      localStorage.setItem("gradeData", JSON.stringify(imported.gradeData));
      localStorage.setItem("subjectWeights", JSON.stringify(imported.subjectWeights));
      alert("✅ 完整資料已匯入成功！");
      renderClassCards(); // 更新班級畫面
    } catch (err) {
      alert("❌ 匯入失敗，請確認備份檔格式是否正確！");
    }
  };
  reader.readAsText(file);
});

document.getElementById("clearTestDataBtn").onclick = () => {
  if (confirm("確定要清除所有成績資料與科目設定嗎？這個動作不可復原！")) {
    localStorage.removeItem("gradeData");
    localStorage.removeItem("subjectWeights");
    alert("✅ 測試資料已清除！");
    renderClassCards(); // 🟡 重建畫面
    document.getElementById("monthlySummaryContainer").innerHTML = "";
    document.querySelector(".top-three-container").innerHTML = "";
  }
};