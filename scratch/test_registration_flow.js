const BASE_URL = 'http://localhost:3001/api';

async function testRegistrationFlow() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ LUỒNG ĐĂNG KÝ TÀI KHOẢN CỘNG TÁC VIÊN MỚI 🚀');
  console.log('================================================================\n');

  let adminToken = '';
  let newCtvId = null;
  let newCtvToken = '';

  const testUserData = {
    username: 'minhhoat_test',
    password: 'password123',
    name: 'Đỗ Minh Hoạt',
    phone: '0909999000',
    email: 'minhhoat@example.com',
    githubUsername: 'minhhoat-git'
  };

  try {
    // ----------------------------------------------------------------
    // BƯỚC 1: Đăng nhập quyền Admin
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 1] Đăng nhập tài khoản Admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (adminLoginRes.status !== 200) {
      throw new Error(`Đăng nhập Admin thất bại với status ${adminLoginRes.status}`);
    }

    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;
    console.log('   ✅ Đăng nhập Admin thành công!');
    console.log(`   🔑 Token Admin: ${adminToken.substring(0, 20)}...\n`);

    // ----------------------------------------------------------------
    // BƯỚC 2: Kiểm tra bắt buộc nhập trường thông tin đăng ký (Validation)
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 2] Kiểm tra Validation khi thiếu trường bắt buộc...');
    const invalidRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'minhhoat_test', password: 'password123' }) // thiếu tên, sđt, email
    });

    const invalidRegData = await invalidRegRes.json();
    console.log(`   Trạng thái phản hồi: ${invalidRegRes.status} (Mong đợi: 400)`);
    console.log(`   Thông điệp lỗi: "${invalidRegData.message}"`);
    if (invalidRegRes.status === 400) {
      console.log('   ✅ ĐẠT: Hệ thống đã chặn thành công khi đăng ký thiếu thông tin.\n');
    } else {
      console.log('   ❌ THẤT BẠI: Hệ thống không chặn được dữ liệu thiếu.\n');
    }

    // ----------------------------------------------------------------
    // BƯỚC 3: Đăng ký CTV mới hợp lệ
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 3] Đăng ký tài khoản CTV mới hợp lệ...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserData)
    });

    const regData = await regRes.json();
    console.log(`   Trạng thái phản hồi: ${regRes.status} (Mong đợi: 201)`);
    console.log(`   Thông điệp phản hồi: "${regData.message}"`);
    if (regRes.status === 201) {
      console.log('   ✅ ĐẠT: Đăng ký tài khoản CTV mới thành công!\n');
    } else {
      throw new Error(`Đăng ký CTV mới thất bại: ${regData.message}`);
    }

    // ----------------------------------------------------------------
    // BƯỚC 4: Kiểm tra chống trùng lặp Username, Email, Phone
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 4] Kiểm tra chống trùng lặp thông tin vừa đăng ký...');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserData) // Gửi lại thông tin trùng
    });

    const dupData = await dupRes.json();
    console.log(`   Trạng thái phản hồi: ${dupRes.status} (Mong đợi: 400)`);
    console.log(`   Thông điệp lỗi trùng lặp: "${dupData.message}"`);
    if (dupRes.status === 400) {
      console.log('   ✅ ĐẠT: Hệ thống chặn trùng lặp thông tin hoàn hảo!\n');
    } else {
      console.log('   ❌ THẤT BẠI: Không chặn được đăng ký trùng lặp.\n');
    }

    // ----------------------------------------------------------------
    // BƯỚC 5: Admin truy xuất danh sách CTV để lấy ID của CTV mới đăng ký
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 5] Admin lấy danh sách CTV để định danh CTV mới đăng ký...');
    const listRes = await fetch(`${BASE_URL}/collaborators`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (listRes.status !== 200) {
      throw new Error(`Admin lấy danh sách CTV thất bại với status ${listRes.status}`);
    }

    const collaborators = await listRes.json();
    const newCtv = collaborators.find(c => c.email === testUserData.email);

    if (!newCtv) {
      throw new Error('Không tìm thấy CTV mới đăng ký trong danh sách của Admin.');
    }

    newCtvId = newCtv.id;
    console.log(`   🆔 Tìm thấy CTV mới đăng ký: ID = ${newCtvId}`);
    console.log(`   ⏳ Trạng thái hiện tại: "${newCtv.status}" (Mong đợi: pending)\n`);

    // ----------------------------------------------------------------
    // BƯỚC 6: Admin phê duyệt duyệt tài khoản mới (Status -> active)
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 6] Admin tiến hành phê duyệt kích hoạt tài khoản CTV...');
    const approveRes = await fetch(`${BASE_URL}/collaborators/${newCtvId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'active' })
    });

    if (approveRes.status !== 200) {
      throw new Error(`Admin duyệt CTV thất bại với status ${approveRes.status}`);
    }

    const approvedCtv = await approveRes.json();
    console.log(`   Trạng thái phản hồi: ${approveRes.status}`);
    console.log(`   ⏳ Trạng thái sau phê duyệt: "${approvedCtv.status}" (Mong đợi: active)`);
    if (approvedCtv.status === 'active') {
      console.log('   ✅ ĐẠT: Phê duyệt kích hoạt CTV thành công!\n');
    } else {
      console.log('   ❌ THẤT BẠI: Duyệt kích hoạt thất bại.\n');
    }

    // ----------------------------------------------------------------
    // BƯỚC 7: Đăng nhập bằng tài khoản CTV mới vừa được kích hoạt
    // ----------------------------------------------------------------
    console.log('👉 [BƯỚC 7] Thử nghiệm đăng nhập bằng tài khoản CTV vừa duyệt...');
    const newCtvLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUserData.username, password: testUserData.password })
    });

    const newCtvLoginData = await newCtvLoginRes.json();
    console.log(`   Trạng thái phản hồi đăng nhập: ${newCtvLoginRes.status} (Mong đợi: 200)`);
    if (newCtvLoginRes.status === 200 && newCtvLoginData.token) {
      newCtvToken = newCtvLoginData.token;
      console.log('   ✅ ĐẠT: CTV mới đã đăng nhập thành công vào hệ thống!');
      console.log(`   🔑 Token CTV mới: ${newCtvToken.substring(0, 20)}...\n`);
    } else {
      throw new Error(`Đăng nhập CTV mới thất bại: ${newCtvLoginData.message}`);
    }

  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
  } finally {
    // ----------------------------------------------------------------
    // BƯỚC 8: DỌN DẸP DỮ LIỆU ĐỂ KIỂM THỬ REPEATABLE
    // ----------------------------------------------------------------
    if (newCtvId && adminToken) {
      console.log('👉 [DỌN DẸP] Tiến hành xóa CTV thử nghiệm để phục vụ các lần chạy sau...');
      try {
        const delRes = await fetch(`${BASE_URL}/collaborators/${newCtvId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const delData = await delRes.json();
        console.log(`   Trạng thái xóa: ${delRes.status}`);
        console.log(`   Thông điệp: "${delData.message}"`);
        console.log('   ✅ ĐÃ DỌN DẸP SẠCH SẼ CƠ SỞ DỮ LIỆU!\n');
      } catch (cleanupErr) {
        console.error('❌ Lỗi khi dọn dẹp dữ liệu:', cleanupErr.message);
      }
    }

    console.log('================================================================');
    console.log('🏁 HOÀN TẤT KIỂM THỬ LUỒNG ĐĂNG KÝ TÀI KHOẢN MỚI 🏁');
    console.log('================================================================');
  }
}

testRegistrationFlow();
