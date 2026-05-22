import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.json');

// Mẫu dữ liệu ban đầu (Seed Data)
export const initialData = {
  users: [
    {
      id: 1,
      username: 'admin',
      // Mật khẩu hash bằng bcryptjs cho 'admin123'
      passwordHash: '$2a$10$u9mMSU.5DQV1DevpIvUtougx7J8a1fw3S/mJgFTUsWpK232dwt3Ie',
      role: 'admin',
      ctvId: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      username: 'hoang',
      // Mật khẩu hash bằng bcryptjs cho 'ctv123'
      passwordHash: '$2a$10$Xlr/3yb16GK9pPXYdMmupOTlxpaFZzmkp1la9OaSf5FYwAyooByn.',
      role: 'collaborator',
      ctvId: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      username: 'mai',
      // Mật khẩu hash bằng bcryptjs cho 'ctv123'
      passwordHash: '$2a$10$Xlr/3yb16GK9pPXYdMmupOTlxpaFZzmkp1la9OaSf5FYwAyooByn.',
      role: 'collaborator',
      ctvId: 2,
      createdAt: new Date().toISOString()
    }
  ],
  collaborators: [
    {
      id: 1,
      name: 'Nguyễn Văn Hoàng',
      phone: '0987654321',
      email: 'hoang.nv@gmail.com',
      balance: 450000,
      status: 'active',
      githubUsername: 'hoang-nv-dev',
      joinedAt: '2026-05-01T08:00:00Z',
      exp: 600,
      level: 2
    },
    {
      id: 2,
      name: 'Trần Thị Mai',
      phone: '0912345678',
      email: 'mai.tt@gmail.com',
      balance: 150000,
      status: 'active',
      githubUsername: 'tranthimai',
      joinedAt: '2026-05-05T09:30:00Z',
      exp: 250,
      level: 1
    },
    {
      id: 3,
      name: 'Lê Hoàng Nam',
      phone: '0903334445',
      email: 'nam.lh@gmail.com',
      balance: 0,
      status: 'pending',
      githubUsername: 'namlh-coder',
      joinedAt: '2026-05-15T14:20:00Z',
      exp: 0,
      level: 1
    },
    {
      id: 4,
      name: 'Phạm Minh Đức',
      phone: '0944555666',
      email: 'duc.pm@gmail.com',
      balance: 0,
      status: 'suspended',
      githubUsername: 'ducpm-suspend',
      joinedAt: '2026-05-10T10:15:00Z',
      exp: 0,
      level: 1
    }
  ],
  tasks: [
    {
      id: 101,
      assignedCtvId: 1,
      title: 'Lập trình API RESTful quản lý thành viên và bảo mật JWT',
      reward: 300000,
      platform: 'GitHub / NodeJS',
      description: 'Xây dựng bộ API quản lý người dùng đầy đủ các tính năng: Đăng ký, đăng nhập, phân quyền admin/ctv sử dụng JWT và bcryptjs.',
      requirements: 'Pull Request gửi mã nguồn NodeJS kèm file Router, Controller và Middleware bảo mật.',
      deadline: '2026-06-15',
      status: 'active',
      createdAt: '2026-05-10T08:00:00Z',
      kpis: [
        'Tỷ lệ bao phủ kiểm thử (Test coverage) cho các routes Auth đạt tối thiểu 80%.',
        'Thời gian phản hồi (API Response Time) trung bình dưới 150ms cho các request thông thường.',
        'Xử lý lỗi (Error handling) chặt chẽ, không để lộ Stack Trace trong môi trường Production.',
        'Không commit các tệp tin cấu hình nhạy cảm (.env) và vượt qua kiểm tra tĩnh (ESLint Security check).'
      ],
      technicalRequirements: [
        'Sử dụng Express.js v5 và thư viện bcryptjs để mã hóa mật khẩu.',
        'Cấu hình JWT Token có thời gian hết hạn (ExpiresIn: 24h) và lưu trữ Token an toàn.',
        'Định dạng JSON Response chuẩn hóa với cấu trúc: { success: true, data: ... } hoặc { success: false, message: ... }.'
      ],
      instructions: [
        'Bước 1: Fork repository chính hoặc clone trực tiếp về máy local của bạn.',
        'Bước 2: Tạo một branch mới từ main có tên theo cấu trúc: feature/task-101-auth-jwt.',
        'Bước 3: Lập trình các routes đăng ký, đăng nhập, phân quyền, middleware JWT trong thư mục server/.',
        'Bước 4: Chạy test ở local để đảm bảo các endpoints hoạt động trơn tru và bảo mật tuyệt đối.',
        'Bước 5: Tạo Pull Request (PR) trỏ về branch main của repo chính và copy đường dẫn PR nộp lên hệ thống.'
      ],
      milestones: [
        { title: 'Thiết kế cơ sở dữ liệu & Router', date: '2026-06-01' },
        { title: 'Hoàn thiện Middleware JWT & Đăng nhập', date: '2026-06-08' },
        { title: 'Viết Unit Tests & Nộp bài chính thức', date: '2026-06-15' },
        { title: 'Admin Đánh giá & Giải ngân', date: '2026-06-17' }
      ]
    },
    {
      id: 102,
      assignedCtvId: null,
      title: 'Xây dựng giao diện Portal Cộng tác viên dạng Glassmorphism',
      reward: 250000,
      platform: 'GitHub / React',
      description: 'Thiết kế và lập trình giao diện Portal CTV cực kỳ đẹp mắt sử dụng React, CSS thuần với hiệu ứng kính mờ (glassmorphism) và responsive đầy đủ.',
      requirements: 'Pull Request sửa đổi/bổ sung component CollaboratorPortal.jsx trong repo chính.',
      deadline: '2026-06-20',
      status: 'active',
      createdAt: '2026-05-12T09:00:00Z',
      kpis: [
        'Giao diện responsive hoàn hảo trên tất cả thiết bị (Mobile, Tablet, Desktop) không vỡ khung.',
        'Điểm hiệu năng Lighthouse Performance tối thiểu đạt từ 90 điểm trở lên.',
        'Các hiệu ứng kính mờ (backdrop-filter) hoạt động mượt mà ở tần số quét cao (60fps).',
        'Đầy đủ các tương tác vi mô (hover, active states, transition mượt) cho tất cả các nút bấm.'
      ],
      technicalRequirements: [
        'Sử dụng React v18 và CSS thuần (Vanilla CSS) để tối ưu khả năng tùy biến thiết kế.',
        'Cấu hình Glassmorphism chuẩn: backdrop-filter: blur(10px) kết hợp màu nền trong suốt RGBA.',
        'Áp dụng Flexbox/Grid CSS thay vì dùng các thư viện UI cồng kềnh để tối ưu tốc độ tải trang.'
      ],
      instructions: [
        'Bước 1: Đồng bộ mã nguồn mới nhất từ nhánh main của repo chính về máy local của bạn.',
        'Bước 2: Tạo một branch mới có tên theo cấu trúc: feature/task-102-portal-glassmorphism.',
        'Bước 3: Sửa đổi/bổ sung component CollaboratorPortal.jsx và các tệp styles index.css tương ứng.',
        'Bước 4: Sử dụng Chrome DevTools giả lập nhiều kích thước màn hình để tối ưu hóa Responsive tối đa.',
        'Bước 5: Tạo Pull Request (PR) trỏ về branch main của repo chính và copy đường dẫn nộp lên hệ thống.'
      ],
      milestones: [
        { title: 'Dựng khung Wireframe & Base layout', date: '2026-06-05' },
        { title: 'Áp dụng CSS Glassmorphism & Hiệu ứng', date: '2026-06-12' },
        { title: 'Tối ưu Responsive & Đóng gói Pull Request', date: '2026-06-20' },
        { title: 'Admin Đánh giá & Giải ngân', date: '2026-06-22' }
      ]
    },
    {
      id: 103,
      assignedCtvId: 2,
      title: 'Viết tài liệu mô tả Endpoints API và hướng dẫn chạy Local',
      reward: 100000,
      platform: 'GitHub / Markdown',
      description: 'Soạn thảo tài liệu mô tả chi tiết tất cả các endpoints REST API của hệ thống (request body, response format) bằng tiếng Việt dạng Markdown.',
      requirements: 'File README.md hoặc API.md được đóng góp thông qua Pull Request.',
      deadline: '2026-06-10',
      status: 'active',
      createdAt: '2026-05-14T11:00:00Z',
      kpis: [
        '100% các API Endpoints được mô tả đầy đủ: Request Headers, Body, Params và Responses mẫu.',
        'Cú pháp Markdown chuẩn hóa, hiển thị phân cấp đẹp mắt và không bị lỗi render.',
        'Cung cấp ví dụ gọi API bằng curl hoặc các lệnh thực tế để CTV dễ dàng chạy thử.'
      ],
      technicalRequirements: [
        'Soạn thảo trực tiếp bằng tệp API.md hoặc tích hợp chi tiết vào tệp README.md chính.',
        'Sử dụng cú pháp GFM (GitHub Flavored Markdown) bao gồm bảng biểu và các khối code phân màu.'
      ],
      instructions: [
        'Bước 1: Clone repo chính về máy local của bạn.',
        'Bước 2: Tạo branch mới có tên theo cấu trúc: docs/task-103-api-spec.',
        'Bước 3: Soạn thảo file API.md mô tả chi tiết tất cả các route (Auth, CTV, Tasks, Submissions, Payouts).',
        'Bước 4: Tạo Pull Request (PR) trỏ về branch main của repo chính và nộp lên hệ thống.'
      ],
      milestones: [
        { title: 'Dự thảo nội dung cấu trúc tài liệu', date: '2026-06-03' },
        { title: 'Hoàn thiện tài liệu tất cả endpoints', date: '2026-06-08' },
        { title: 'Tạo Pull Request nộp bài chính thức', date: '2026-06-10' },
        { title: 'Admin Đánh giá & Giải ngân', date: '2026-06-12' }
      ]
    },
    {
      id: 104,
      assignedCtvId: null,
      title: 'Sửa lỗi CSS vỡ layout Menu Mobile và card sản phẩm trên Safari iOS',
      reward: 80000,
      platform: 'GitHub / CSS',
      description: 'Khắc phục hiện tượng menu mobile bị che khuất và các card sản phẩm không thẳng hàng trên trình duyệt Safari iOS.',
      requirements: 'Pull Request sửa các file CSS liên quan (index.css) và test responsive hoạt động mượt mà.',
      deadline: '2026-06-05',
      status: 'active',
      createdAt: '2026-05-18T15:30:00Z',
      kpis: [
        'Sửa triệt để hiện tượng vỡ layout trên Safari iOS phiên bản từ 14 trở lên.',
        'Không gây ảnh hưởng hoặc thay đổi bất thường layout trên Chrome, Edge và Safari máy Mac.',
        'Menu Mobile mở và đóng mượt mà, không bị hiện tượng giật lag màn hình.'
      ],
      technicalRequirements: [
        'Sử dụng CSS Prefixes thích hợp (-webkit-) cho các thuộc tính flex/grid chưa tương thích hoàn toàn.',
        'Sử dụng biến CSS custom properties để đồng bộ hóa các lớp giao diện.'
      ],
      instructions: [
        'Bước 1: Tạo branch mới từ main có tên: bugfix/task-104-safari-css.',
        'Bước 2: Sử dụng Safari Web Inspector hoặc Chrome DevTools (Responsive mode với iOS User Agent) để debug.',
        'Bước 3: Chỉnh sửa các quy tắc CSS bị lỗi trong file index.css.',
        'Bước 4: Test cẩn thận trên thiết bị thực hoặc trình giả lập trước khi đẩy code.',
        'Bước 5: Tạo Pull Request (PR) nộp bài chính thức và nộp link PR lên hệ thống.'
      ],
      milestones: [
        { title: 'Tái hiện và xác định nguyên nhân lỗi', date: '2026-06-02' },
        { title: 'Sửa lỗi và test chéo trên các trình duyệt', date: '2026-06-04' },
        { title: 'Tạo Pull Request nộp bài chính thức', date: '2026-06-05' },
        { title: 'Admin Đánh giá & Giải ngân', date: '2026-06-07' }
      ]
    },
    {
      id: 105,
      assignedCtvId: null,
      title: 'Viết Unit Test bảo vệ toàn bộ API Routes bằng Jest & Supertest',
      reward: 200000,
      platform: 'GitHub / NodeJS',
      description: 'Thiết lập môi trường kiểm thử tự động, viết test-suite bao phủ toàn bộ các routes: auth, collaborators, tasks, submissions.',
      requirements: 'Pull Request bổ sung thư mục tests/ chứa các file *.test.js chạy thành công qua lệnh npm test.',
      deadline: '2026-06-25',
      status: 'active',
      createdAt: '2026-05-22T08:00:00Z',
      kpis: [
        'Độ bao phủ dòng code (Statement coverage) đạt trên 85% toàn bộ hệ thống API backend.',
        '100% các Test Case đều phải pass thành công khi chạy lệnh npm test.',
        'Các Test Case hoàn toàn độc lập, có cơ chế reset database tự động sau mỗi phiên test.'
      ],
      technicalRequirements: [
        'Sử dụng Jest làm test runner chính và Supertest để giả lập các HTTP requests.',
        'Viết test chi tiết cho cả luồng thành công (Happy Path) và luồng thất bại (Edge Cases, Invalid Inputs).'
      ],
      instructions: [
        'Bước 1: Cài đặt các thư viện kiểm thử: npm install --save-dev jest supertest.',
        'Bước 2: Tạo branch mới có tên: test/task-105-api-unit-tests.',
        'Bước 3: Viết các test suite chi tiết trong thư mục tests/ mới tạo.',
        'Bước 4: Chạy thử npm test ở local để kiểm chứng tính đúng đắn của toàn bộ kịch bản.',
        'Bước 5: Tạo Pull Request (PR) nộp bài chính thức và gửi link lên cổng thông tin.'
      ],
      milestones: [
        { title: 'Cấu hình môi trường Jest & Viết test cho Auth', date: '2026-06-10' },
        { title: 'Viết test cho Collaborators & Tasks routes', date: '2026-06-18' },
        { title: 'Hoàn thiện test coverage & Tạo Pull Request', date: '2026-06-25' },
        { title: 'Admin Đánh giá & Giải ngân', date: '2026-06-27' }
      ]
    },
    {
      id: 106,
      assignedCtvId: null,
      title: 'Phát triển Extension dịch thuật Việt hóa thông minh tương tự Immersive Translate',
      reward: 200000,
      platform: 'Chrome Extension / JavaScript',
      description: 'Xây dựng tiện ích dịch thuật song ngữ thông minh cho trình duyệt Chrome tương tự Immersive Translate. Cho phép cấu hình khóa API Key bên ngoài (OpenAI, Gemini, v.v.) để tự chi trả chi phí dịch và giao diện hoàn toàn bằng Tiếng Việt.',
      requirements: 'Đóng góp mã nguồn Chrome Extension đầy đủ (manifest.json, popup.html, content.js, background.js) qua Pull Request.',
      deadline: '2026-06-30',
      status: 'active',
      createdAt: '2026-05-22T08:15:00Z',
      kpis: [
        'Dịch thuật trực quan song ngữ (hiển thị văn bản dịch ngay dưới văn bản gốc) không phá vỡ layout trang.',
        'Giao diện Popup cài đặt thân thiện, Việt hóa 100%, thao tác cấu hình API Keys mượt mà.',
        'Tương thích hoàn toàn chuẩn Manifest V3 mới nhất của Chrome Web Store.',
        'Xử lý lỗi kết nối API tinh tế, hiển thị thông báo rõ ràng cho người dùng khi khóa hết hạn/lỗi.'
      ],
      technicalRequirements: [
        'Sử dụng chuẩn Manifest V3 để đảm bảo khả năng duyệt và phát hành trên Chrome Web Store.',
        'Lưu trữ khóa API an toàn bằng chrome.storage.local/sync và gọi bất đồng bộ.',
        "Tối ưu DOM parser để nhận diện văn bản cần dịch hiệu quả, tránh làm chậm trình duyệt."
      ],
      instructions: [
        'Bước 1: Fork và clone mã nguồn dự án chính về máy local của bạn.',
        'Bước 2: Tạo branch làm việc mới: feature/task-106-translation-extension.',
        'Bước 3: Lập trình giao diện popup và tiêm mã (content script) dịch thuật trực tiếp.',
        'Bước 4: Test thử nghiệm load unpacked trên Chrome Developer Mode hoạt động mượt mà.',
        'Bước 5: Tạo Pull Request (PR) đóng góp mã nguồn extension và nộp link PR lên hệ thống.'
      ],
      milestones: [
        { title: 'Dựng Popup cài đặt & Cấu hình API Key Việt hóa', date: '2026-06-10' },
        { title: 'Hoàn thiện mã dịch thuật song ngữ trên trang Web', date: '2026-06-20' },
        { title: 'Kiểm thử tổng hợp & Nộp Pull Request', date: '2026-06-30' },
        { title: 'Admin Đánh giá & Giải ngân', date: '2026-07-02' }
      ]
    }
  ],
  submissions: [
    {
      id: 201,
      ctvId: 1,
      taskId: 101,
      reward: 300000,
      proofUrl: 'https://github.com/vudanhdu2/aihot-vn/pull/2',
      proofText: 'Đã hoàn thiện bộ API đăng ký, đăng nhập và tích hợp middleware JWT bảo vệ các routes CTV/Admin.',
      status: 'approved',
      rejectReason: '',
      submittedAt: '2026-05-15T09:00:00Z',
      reviewedAt: '2026-05-16T10:00:00Z'
    },
    {
      id: 202,
      ctvId: 1,
      taskId: 102,
      reward: 300000, // Hoàng làm nhiệm vụ 102 nhận 300k do thưởng thêm
      proofUrl: 'https://github.com/hoang-nv-dev/aihot-vn/pull/5',
      proofText: 'Gửi giao diện portal cộng tác viên, sử dụng CSS backdrop-filter để tạo hiệu ứng kính mờ cao cấp.',
      status: 'approved',
      rejectReason: '',
      submittedAt: '2026-05-18T14:30:00Z',
      reviewedAt: '2026-05-19T09:15:00Z'
    },
    {
      id: 203,
      ctvId: 2,
      taskId: 102,
      reward: 250000,
      proofUrl: 'https://github.com/tranthimai/aihot-vn/pull/3',
      proofText: 'Gửi code React component portal, có tích hợp bảng lịch sử nộp bài và rút tiền.',
      status: 'approved',
      rejectReason: '',
      submittedAt: '2026-05-16T16:00:00Z',
      reviewedAt: '2026-05-17T11:00:00Z'
    },
    {
      id: 204,
      ctvId: 2,
      taskId: 103,
      reward: 100000,
      proofUrl: 'https://github.com/tranthimai/aihot-vn/blob/docs/API.md',
      proofText: 'Đã cập nhật file API.md chi tiết toàn bộ endpoint kèm mã trạng thái HTTP status code.',
      status: 'pending',
      rejectReason: '',
      submittedAt: '2026-05-20T10:00:00Z',
      reviewedAt: null
    }
  ],
  payouts: [
    {
      id: 301,
      ctvId: 1,
      amount: 150000,
      bankName: 'Techcombank',
      accountNumber: '1903527299018',
      accountHolder: 'NGUYEN VAN HOANG',
      status: 'paid',
      rejectReason: '',
      transactionId: 'FT2605179021',
      requestedAt: '2026-05-17T11:30:00Z',
      resolvedAt: '2026-05-17T14:00:00Z'
    },
    {
      id: 302,
      ctvId: 2,
      amount: 100000,
      bankName: 'Vietcombank',
      accountNumber: '0071001234567',
      accountHolder: 'TRAN THI MAI',
      status: 'pending',
      rejectReason: '',
      transactionId: '',
      requestedAt: '2026-05-21T08:45:00Z',
      resolvedAt: null
    }
  ],
  transactions: [],
  activityLogs: [],
  notifications: [],
  agentTokens: []
};

export const ensureDbCollections = (db) => {
  db.transactions = db.transactions || [];
  db.activityLogs = db.activityLogs || [];
  db.notifications = db.notifications || [];
  db.agentTokens = db.agentTokens || [];
  return db;
};

const getNextLocalId = (records = []) => {
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => r.id || 0)) + 1;
};

export const addActivityLog = (db, { actorRole = 'system', actorId = null, eventType, entityType, entityId, message, metadata = {} }) => {
  ensureDbCollections(db);
  const log = {
    id: getNextLocalId(db.activityLogs),
    actorRole,
    actorId,
    eventType,
    entityType,
    entityId,
    message,
    metadata,
    createdAt: new Date().toISOString()
  };
  db.activityLogs.unshift(log);
  return log;
};

export const addNotification = (db, { recipientRole, recipientCtvId = null, type, title, message, entityType, entityId }) => {
  ensureDbCollections(db);
  const notification = {
    id: getNextLocalId(db.notifications),
    recipientRole,
    recipientCtvId,
    type,
    title,
    message,
    readAt: null,
    entityType,
    entityId,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notification);
  return notification;
};

export const getTaskCode = (task) => task.taskCode || `task-${task.id}`;

export const normalizeTaskLifecycle = (task, submissions = []) => {
  const taskSubmissions = submissions.filter(s => s.taskId === task.id);
  task.submissionCount = taskSubmissions.length;
  task.taskCode = getTaskCode(task);
  task.githubRepo = task.githubRepo || '';
  task.githubBranch = task.githubBranch || '';
  task.acceptedAt = task.acceptedAt || null;
  task.completedAt = task.completedAt || null;
  task.cancelledAt = task.cancelledAt || null;
  task.lastActivityAt = task.lastActivityAt || task.createdAt || null;
  return task;
};

// Tính toán Cấp độ (Level) và thông số liên quan từ EXP
export const getLevelInfo = (exp) => {
  const currentExp = Number(exp) || 0;
  if (currentExp < 500) {
    return { level: 1, maxJobs: 1, bonusPercent: 0, nextLevelExp: 500, prevLevelExp: 0 };
  } else if (currentExp < 1500) {
    return { level: 2, maxJobs: 2, bonusPercent: 5, nextLevelExp: 1500, prevLevelExp: 500 };
  } else if (currentExp < 3500) {
    return { level: 3, maxJobs: 3, bonusPercent: 10, nextLevelExp: 3500, prevLevelExp: 1500 };
  } else if (currentExp < 7500) {
    return { level: 4, maxJobs: 4, bonusPercent: 15, nextLevelExp: 7500, prevLevelExp: 3500 };
  } else {
    return { level: 5, maxJobs: 5, bonusPercent: 20, nextLevelExp: null, prevLevelExp: 7500 };
  }
};

// Đọc toàn bộ DB
export const readDb = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(initialData);
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Lỗi khi đọc file Database:', err);
    return initialData;
  }
};

// Ghi đè DB
export const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Lỗi khi ghi file Database:', err);
    return false;
  }
};

// Hàm tiện ích tự động tạo ID tăng dần
export const getNextId = (table) => {
  const db = readDb();
  const records = db[table] || [];
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => r.id)) + 1;
};

// Reset database về dữ liệu ban đầu
export const resetDb = () => {
  writeDb(initialData);
  return initialData;
};
