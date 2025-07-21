// 📘 成績編輯模組：gradeEditor.js
window.addEventListener("DOMContentLoaded", () => {
  const classSelect = document.getElementById("editorClassSelect");
  const studentSelect = document.getElementById("editorStudentSelect");
  const tableContainer = document.getElementById("studentScoresTableContainer");

  // ✅ 讀取資料
  const raw = localStorage.getItem("gradeData") || "{}";
  const gradeData = JSON.parse(raw);

  // ✅ 初始化班級選單
  Object.keys(gradeData).forEach(className => {
    const opt = document.createElement("option");
    opt.value = className;
    opt.textContent = className;
    classSelect.appendChild(opt);
  });

  // ✅ 切換班級時載入學生名單
  classSelect.onchange = () => {
    const className = classSelect.value;
    const studentList = gradeData[className]["學生名單"] || [];
    studentSelect.innerHTML = '<option disabled selected>請選擇學生</option>';

    studentList.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      studentSelect.appendChild(opt);
    });

    tableContainer.innerHTML = "";
  };

  // ✅ 選擇學生後 ➜ 顯示所有成績
studentSelect.onchange = () => {
  const className = classSelect.value;
  const student = studentSelect.value;
  const records = gradeData[className]["成績"] || [];

  const filtered = records.filter(r => r["學生"] === student);

  updateEditorStatus(className, student, filtered.length);

  if (filtered.length === 0) {
    tableContainer.innerHTML = "<p>該學生尚無任何成績。</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "monthly-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th><input type="checkbox" id="editorSelectAll"></th>
        <th>科目</th>
        <th>類型</th>
        <th>分數</th>
        <th>上傳時間</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      ${filtered.map((r, i) => `
        <tr>
          <td><input type="checkbox" class="editorItemCheck" data-index="${i}"></td>
          <td>${r["科目"]}</td>
          <td>${r["科目類型"]}</td>
          <td><input type="number" value="${r["分數"]}" class="editorScoreInput" data-index="${i}"></td>
          <td>${r["上傳時間"]}</td>
          <td><button class="deleteScoreBtn" data-index="${i}">刪除</button></td>
        </tr>
      `).join("")}
    </tbody>
  `;

  tableContainer.classList.add("fade-out");

setTimeout(() => {
    
document.getElementById("bulkDeleteBtn").onclick = () => {
  const checkedBoxes = Array.from(document.querySelectorAll(".editorItemCheck:checked"));
  if (checkedBoxes.length === 0) {
    alert("請先勾選要刪除的成績");
    return;
  }

  if (!confirm(`確定要刪除這 ${checkedBoxes.length} 筆成績嗎？此操作不可復原！`)) return;

  const className = classSelect.value;
  const student = studentSelect.value;
  const records = gradeData[className]["成績"] || [];

  checkedBoxes.forEach(cb => {
    const i = parseInt(cb.dataset.index);
    const targetRecord = filtered[i];
    // 逐筆刪除
    gradeData[className]["成績"] = gradeData[className]["成績"].filter(r => !isSameRecord(r, targetRecord));
  });

  localStorage.setItem("gradeData", JSON.stringify(gradeData));
  showEditorToast(`🗑️ 已刪除 ${checkedBoxes.length} 筆成績！`);
  studentSelect.onchange(); // 重載畫面
};

  tableContainer.classList.remove("fade-out");
  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);

  // ✅ ✅ ✅ 把這段放在 appendChild(table) 的後面！

  const selectAll = document.getElementById("editorSelectAll");
  const itemCheckboxes = table.querySelectorAll(".editorItemCheck");

  selectAll.addEventListener("change", () => {
    const isChecked = selectAll.checked;

    itemCheckboxes.forEach(cb => {
      cb.checked = isChecked;
      const row = cb.closest("tr");
      row.classList.toggle("selected-row", isChecked);
    });

    updateSelectedCount();
  });

  itemCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const row = cb.closest("tr");
      row.classList.toggle("selected-row", cb.checked);
      updateSelectedCount();
      checkSelectAllState();
    });
  });

  function checkSelectAllState() {
    const total = itemCheckboxes.length;
    const checked = Array.from(itemCheckboxes).filter(cb => cb.checked).length;
    selectAll.indeterminate = checked > 0 && checked < total;
    selectAll.checked = checked === total;
  }
}, 300);

  // ✏️ 分數即時編輯
  table.querySelectorAll(".editorScoreInput").forEach(input => {
    input.addEventListener("change", e => {
      const i = parseInt(e.target.dataset.index);
      const newScore = Number(e.target.value);
      const targetRecord = filtered[i];

      const indexInRecords = records.findIndex(r => isSameRecord(r, targetRecord));
      if (indexInRecords !== -1) {
        records[indexInRecords]["分數"] = newScore;
        gradeData[className]["成績"] = records;
        localStorage.setItem("gradeData", JSON.stringify(gradeData));
        showEditorToast("✏️ 成績已更新！");
      }
    });
  });

  // 🗑️ 單筆刪除
  table.querySelectorAll(".deleteScoreBtn").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.target.dataset.index);
      const targetRecord = filtered[i];

      gradeData[className]["成績"] = records.filter(r => !isSameRecord(r, targetRecord));
      localStorage.setItem("gradeData", JSON.stringify(gradeData));
      showEditorToast("🗑️ 成績已刪除！");
      studentSelect.onchange();
    });
  });

  // ✅ 勾選高亮、統計提示
  function updateSelectedCount() {
    const count = document.querySelectorAll(".editorItemCheck:checked").length;
    document.getElementById("selectedCountNotice").textContent =
      count > 0 ? `✅ 已選取 ${count} 筆成績` : "";
  }

  const itemCheckboxes = table.querySelectorAll(".editorItemCheck");
  const selectAll = document.getElementById("editorSelectAll");

  selectAll.addEventListener("change", () => {
    const isChecked = selectAll.checked;

    itemCheckboxes.forEach(cb => {
      cb.checked = isChecked;
      const row = cb.closest("tr");
      row.classList.toggle("selected-row", isChecked);
    });

    updateSelectedCount();
  });

  itemCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const row = cb.closest("tr");
      row.classList.toggle("selected-row", cb.checked);
      updateSelectedCount();
      checkSelectAllState();
    });
  });

  function checkSelectAllState() {
    const total = itemCheckboxes.length;
    const checked = Array.from(itemCheckboxes).filter(cb => cb.checked).length;
    selectAll.indeterminate = checked > 0 && checked < total;
    selectAll.checked = checked === total;
  }
};



  // 🔴 清空整個學生紀錄 ➜ 退班功能
  document.getElementById("resetStudentBtn").onclick = () => {
    const className = classSelect.value;
    const student = studentSelect.value;

    if (!className || !student) return alert("請先選擇班級與學生");

    if (confirm(`確定要將「${student}」從「${className}」退班並清空所有成績？`)) {
      gradeData[className]["成績"] = (gradeData[className]["成績"] || []).filter(r => r["學生"] !== student);
      gradeData[className]["學生名單"] = (gradeData[className]["學生名單"] || []).filter(n => n !== student);
      localStorage.setItem("gradeData", JSON.stringify(gradeData));
      alert("✅ 學生資料已清除！");
      studentSelect.innerHTML = "";
      tableContainer.innerHTML = "";
    }
  };

  // ✅ 精準資料比對函式：比學生、科目、類型、上傳時間
  function isSameRecord(a, b) {
    return a["學生"] === b["學生"] &&
           a["科目"] === b["科目"] &&
           a["科目類型"] === b["科目類型"] &&
           a["上傳時間"] === b["上傳時間"];
  }
});

function showEditorToast(message = "✅ 資料已更新") {
  const toast = document.getElementById("editorToast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500); // 2.5秒後自動消失
}

function updateEditorStatus(className, student, total) {
  const statusBar = document.getElementById("editorStatusBar");
  if (!className || !student) {
    statusBar.textContent = "請先選擇班級與學生";
    return;
  }
  statusBar.textContent = `目前班級：${className}｜學生：${student}｜已讀取 ${total} 筆成績`;
}