import React, { useState, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
  Layout, Menu, Typography, Card, Table, Steps, Timeline, Collapse, Alert, 
  Tag, Row, Col, Divider, Input, Drawer, Grid, Statistic, Badge, Button, Result, Space 
} from 'antd';
import {
  ReadOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  DollarOutlined,
  CarOutlined,
  ShopOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  BankOutlined,
  SwapOutlined,
  UsergroupAddOutlined,
  MenuOutlined,
  SearchOutlined,
  BulbOutlined,
  RocketOutlined,
  LikeOutlined,
  SettingOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  FilePdfOutlined
} from '@ant-design/icons';

const { Content, Sider } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;
const { useBreakpoint } = Grid;

const DocumentationPage: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('intro');
  const [searchValue, setSearchValue] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  
  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "MUTex_Qollanma",
  });

  // --- Data Definitions ---

  const rolesData = [
    {
      role: "DIRECTOR",
      description: "Tizimning to'liq boshqaruvchisi.",
      access: "Barcha modullar, to'liq nazorat.",
      responsibilities: ["Strategik qarorlar", "Moliyaviy nazorat", "Xodimlar boshqaruvi"]
    },
    {
      role: "MANAGER",
      description: "Operatsion boshqaruvchi.",
      access: "Barcha modullar (Sozlamalardan tashqari).",
      responsibilities: ["Ishlab chiqarish rejasi", "Sotuv va xaridlar", "Ombor nazorati"]
    },
    {
      role: "ACCOUNTANT",
      description: "Bosh hisobchi.",
      access: "Moliya, Hisobotlar, Fakturalar, Hamkorlar.",
      responsibilities: ["Kirim-chiqim", "Ish haqi", "Qarzdorliklar", "Moliyaviy hisobot"]
    },
    {
      role: "SELLER",
      description: "Sotuv menejeri.",
      access: "Fakturalar (Sotuv), Mijozlar, Ombor (Ko'rish).",
      responsibilities: ["Buyurtmalar", "Sotuv fakturalari", "Mijozlar bilan ishlash"]
    },
    {
      role: "WORKER",
      description: "Ishlab chiqarish xodimi.",
      access: "Qoplash, Ombor (Ko'rish), Partiyalar.",
      responsibilities: ["Jarayonlarni qayd etish", "Mahsulot holatini o'zgartirish"]
    }
  ];

  const roleColumns = [
    { title: 'Rol', dataIndex: 'role', key: 'role', render: (text: string) => <Tag color="blue">{text}</Tag> },
    { title: 'Tavsif', dataIndex: 'description', key: 'description' },
    { title: 'Ruxsatlar', dataIndex: 'access', key: 'access', render: (text: string) => <Text type="secondary">{text}</Text> },
  ];

  // --- Content Components ---

  const IntroContent = () => (
    <div className="animate-fade-in space-y-8">
      <div className="text-center mb-10">
        <Title level={1} style={{ background: 'linear-gradient(to right, #1890ff, #722ed1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MUTex Knowledge Base
        </Title>
        <Paragraph className="text-lg text-gray-500">
          Korxonani samarali boshqarish uchun mukammal qo'llanma
        </Paragraph>
        <div className="no-print">
          <Input 
            size="large" 
            placeholder="Qo'llanmadan qidirish..." 
            prefix={<SearchOutlined />} 
            style={{ maxWidth: 500 }}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Badge.Ribbon text="Xavfsiz" color="blue">
            <Card hoverable className="h-full border-t-4 border-t-blue-500">
              <div className="text-center">
                <SafetyCertificateOutlined className="text-5xl text-blue-500 mb-4" />
                <Title level={4}>Xavfsizlik</Title>
                <Paragraph>Har bir xodim uchun alohida kirish huquqlari va ma'lumotlar himoyasi.</Paragraph>
              </div>
            </Card>
          </Badge.Ribbon>
        </Col>
        <Col xs={24} md={8}>
          <Badge.Ribbon text="Tezkor" color="green">
            <Card hoverable className="h-full border-t-4 border-t-green-500">
              <div className="text-center">
                <RocketOutlined className="text-5xl text-green-500 mb-4" />
                <Title level={4}>Tezkorlik</Title>
                <Paragraph>Barcha hisob-kitoblar va ombor qoldiqlari real vaqt rejimida yangilanadi.</Paragraph>
              </div>
            </Card>
          </Badge.Ribbon>
        </Col>
        <Col xs={24} md={8}>
          <Badge.Ribbon text="Smart" color="purple">
            <Card hoverable className="h-full border-t-4 border-t-purple-500">
              <div className="text-center">
                <BulbOutlined className="text-5xl text-purple-500 mb-4" />
                <Title level={4}>Aqlli Tahlil</Title>
                <Paragraph>Biznesingiz holatini avtomatik grafiklar va hisobotlar orqali kuzating.</Paragraph>
              </div>
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>

      <Divider orientation="left">Tizimni ishga tushirish</Divider>
      <Steps 
        current={1} 
        items={[
          { title: 'Ro\'yxatdan o\'tish', description: 'Admin tomonidan xodimlar kiritiladi.' },
          { title: 'Sozlamalar', description: 'Kompaniya ma\'lumotlari va valyuta kurslari kiritiladi.' },
          { title: 'Boshlash', description: 'Ombor qoldiqlarini kiritish va ishni boshlash.' },
        ]} 
      />
    </div>
  );

  const RolesContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title level={2}>Rollar va Ruxsatlar</Title>
        <Tag color="geekblue" className="text-lg p-1 px-3">5 ta asosiy rol</Tag>
      </div>
      <Alert 
        message="Xavfsizlik Eslatmasi" 
        description="Xodim ishdan bo'shaganda uning profilini o'chirish yoki bloklash esdan chiqmasin!" 
        type="warning" 
        showIcon 
      />
      <Table 
        columns={roleColumns} 
        dataSource={rolesData} 
        pagination={false} 
        rowKey="role"
        expandable={{
          expandedRowRender: (record) => (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Text strong className="text-blue-600">Asosiy vazifalari:</Text>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                {record.responsibilities.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ),
        }}
      />
    </div>
  );

  const FinanceContent = () => (
    <div className="space-y-8">
      <Title level={2}>Moliya va Hisob-kitob</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Collapse defaultActiveKey={['1']} className="bg-white shadow-sm rounded-lg">
            <Panel header={<Space><BankOutlined /> <Text strong>Hisoblar (Kassa va Bank)</Text></Space>} key="1">
              <Paragraph>Korxonaning barcha pul saqlash joylari boshqaruvi.</Paragraph>
              <Timeline>
                <Timeline.Item color="green">Hisob ochish (Masalan: "Kassa 1")</Timeline.Item>
                <Timeline.Item color="blue">Pul tushumi (Sotuvdan yoki Boshqa)</Timeline.Item>
                <Timeline.Item color="red">Chiqim qilish (Xarajatlar)</Timeline.Item>
                <Timeline.Item color="gray">O'tkazma (Kassadan Bankka)</Timeline.Item>
              </Timeline>
            </Panel>
            <Panel header={<Space><SwapOutlined /> <Text strong>Qarzlar va To'lovlar</Text></Space>} key="2">
              <Paragraph>Debitor va Kreditor qarzdorliklar nazorati.</Paragraph>
              <Alert message="Avtomatizatsiya" description="Faktura tasdiqlanganda qarz avtomatik yoziladi." type="info" showIcon />
            </Panel>
            <Panel header={<Space><UsergroupAddOutlined /> <Text strong>Ish haqi</Text></Space>} key="3">
              <Paragraph>Xodimlar oylik maoshini hisoblash, avans berish va jarimalar.</Paragraph>
            </Panel>
          </Collapse>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Statistika namunasi" className="shadow-md">
            <Row gutter={[16, 16]}>
              <Col span={24} xl={12}>
                <Statistic title="Kirim" value={112893} prefix={<DollarOutlined />} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col span={24} xl={12}>
                <Statistic title="Chiqim" value={93420} prefix={<DollarOutlined />} valueStyle={{ color: '#cf1322' }} />
              </Col>
            </Row>
            <Divider />
            <Text type="secondary" className="text-xs">Bu shunchaki namuna. Haqiqiy ma'lumotlar Moliya bo'limida ko'rsatiladi.</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const ProductionContent = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-8 rounded-xl text-white mb-6">
        <Title level={2} style={{ color: 'white' }}>Ishlab Chiqarish Jarayoni</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.8)' }}>
          Xomashyodan tayyor mahsulotgacha bo'lgan to'liq sikl nazorati.
        </Paragraph>
      </div>

      <Steps 
        current={-1} 
        items={[
          { title: 'Yumshoq Motka', icon: <div className="bg-blue-100 p-2 rounded-full"><CarOutlined className="text-blue-600"/></div> },
          { title: 'Bo\'yoqxona', icon: <div className="bg-purple-100 p-2 rounded-full"><ExperimentIcon /></div> },
          { title: 'Qattiq Motka', icon: <div className="bg-orange-100 p-2 rounded-full"><SettingOutlined className="text-orange-600"/></div> },
          { title: 'Qadoqlash', icon: <div className="bg-green-100 p-2 rounded-full"><CheckCircleOutlined className="text-green-600"/></div> },
        ]} 
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card title="1. Partiya yaratish" className="h-full hover:shadow-lg transition-shadow">
            <Paragraph>
              Ishlab chiqarish "Partiya" yaratishdan boshlanadi.
            </Paragraph>
            <ul className="list-disc ml-4 space-y-2">
              <li>Mijoz tanlanadi (kim uchun).</li>
              <li>Ip turi va rangi tanlanadi.</li>
              <li>Miqdor (kg) kiritiladi.</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="2. Retseptura (Bo'yoq)" className="h-full hover:shadow-lg transition-shadow">
            <Paragraph>
              Laboratoriya tomonidan tasdiqlangan rang retsepti kiritiladi.
            </Paragraph>
            <Alert message="Diqqat" description="Noto'g'ri retsept mahsulot buzilishiga olib keladi!" type="error" showIcon />
          </Card>
        </Col>
      </Row>
    </div>
  );

  const SalesContent = () => (
    <div className="space-y-6">
      <Title level={2}>Fakturalar va Sotuv</Title>
      
      <Result
        icon={<LikeOutlined />}
        title="Sotuv jarayoni soddalashtirilgan!"
        subTitle="Endi faktura yaratish atigi 3 qadamda amalga oshiriladi."
        extra={[
          <Button type="primary" key="console">Faktura ochishni ko'rish</Button>,
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Yangi Faktura ochish" variant="borderless" className="shadow-sm border-l-4 border-l-blue-500">
            <Steps direction="vertical" size="small" current={-1} items={[
              { title: 'Mijozni tanlash', description: 'Mavjud mijozlardan birini tanlang yoki yangisini qo\'shing.' },
              { title: 'Mahsulot qo\'shish', description: 'Omborda mavjud mahsulotlarni tanlang.' },
              { title: 'Narx va Chegirma', description: 'Kelishilgan narxni kiriting.' },
              { title: 'Tasdiqlash', description: 'Saqlash tugmasini bosganda ombordan mahsulot ayriladi.' }
            ]} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Faktura turlari" variant="borderless" className="shadow-sm border-l-4 border-l-green-500">
            <ul className="list-disc ml-4 space-y-4 text-lg">
              <li><Tag color="blue">Sotuv</Tag> Mijozga mahsulot sotish.</li>
              <li><Tag color="red">Qaytarish</Tag> Mijozdan mahsulot qaytib kelishi.</li>
              <li><Tag color="gold">Xarid</Tag> Yetkazib beruvchidan xomashyo olish.</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const InventoryContent = () => (
    <div className="space-y-6">
      <Title level={2}>Ombor va Logistika</Title>
      <Alert 
        message="Inventarizatsiya" 
        description="Har oy oxirida ombor qoldiqlarini sanash va tizim bilan solishtirish tavsiya etiladi." 
        type="info" 
        showIcon 
        icon={<ExportOutlined />}
      />

      <Collapse defaultActiveKey={['1']}>
        <Panel header="Xomashyo Ombori" key="1">
          <p>Ip, bo'yoq, kimyoviy moddalar va qadoqlash materiallari saqlanadigan joy.</p>
          <Text type="warning"><WarningOutlined /> Qoldiq kamayganda tizim ogohlantiradi.</Text>
        </Panel>
        <Panel header="Tayyor Mahsulotlar" key="2">
          <p>Sotuvga tayyor bo'lgan qadoqlangan mahsulotlar.</p>
        </Panel>
        <Panel header="Yarim Tayyor Mahsulotlar" key="3">
          <p>Ishlab chiqarish jarayonidagi (bo'yoqxonadagi) mahsulotlar.</p>
        </Panel>
      </Collapse>
    </div>
  );

  const TroubleshootingContent = () => (
    <div className="space-y-6">
      <Title level={2}>FAQ: Ko'p beriladigan savollar</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Collapse accordion className="bg-white rounded-lg shadow-sm">
            <Panel header="Tizimga kira olmayapman, nima qilishim kerak?" key="1">
              <p>Login yoki parolingizni tekshiring. Katta-kichik harflarga (Caps Lock) e'tibor bering. Agar esdan chiqqan bo'lsa, Administratorga murojaat qiling.</p>
            </Panel>
            <Panel header="Faktura summasi noto'g'ri chiqayapti" key="2">
              <p>Mahsulot narxi va sonini tekshiring. Ba'zan chegirma noto'g'ri qo'llanilgan bo'lishi mumkin. Qayta hisoblash tugmasini bosing.</p>
            </Panel>
            <Panel header="Omborda qoldiq manfiy bo'lib qoldi" key="3">
              <p>Bu odatda "Kirim" qilinmasdan turib "Chiqim" yoki "Sotuv" qilinganda sodir bo'ladi. Avval xomashyoni kirim qiling, keyin chiqim qiling.</p>
            </Panel>
            <Panel header="Hisobotlarda ma'lumot ko'rinmayapti" key="4">
              <p>Sana oralig'ini tekshiring (Filter). Balki tanlangan davrda hech qanday operatsiya bo'lmagandir.</p>
            </Panel>
          </Collapse>
        </Col>
      </Row>

      <Divider />
      
      <div className="bg-blue-50 p-6 rounded-lg text-center">
        <Title level={4}>Savolingizga javob topa olmadingizmi?</Title>
        <Paragraph>Texnik yordam xizmatimizga murojaat qiling.</Paragraph>
        <Button type="primary" icon={<QuestionCircleOutlined />}>Yordam so'rash</Button>
      </div>
    </div>
  );

  // --- Menu Configuration ---

  const menuItems = [
    { key: 'intro', icon: <ReadOutlined />, label: 'Kirish' },
    { key: 'roles', icon: <SafetyCertificateOutlined />, label: 'Rollar' },
    { type: 'divider' },
    { key: 'grp-modules', label: 'Modullar', type: 'group', children: [
      { key: 'finance', icon: <DollarOutlined />, label: 'Moliya' },
      { key: 'production', icon: <CarOutlined />, label: 'Ishlab Chiqarish' },
      { key: 'sales', icon: <FileTextOutlined />, label: 'Fakturalar' },
      { key: 'inventory', icon: <ShopOutlined />, label: 'Ombor' },
    ]},
    { type: 'divider' },
    { key: 'troubleshooting', icon: <QuestionCircleOutlined />, label: 'FAQ' },
  ];

  // Filter menu items based on search
  const filteredMenuItems = useMemo(() => {
    if (!searchValue) return menuItems;
    
    // Simple filter logic (can be enhanced)
    return menuItems.map(item => {
      if ((item as any).children) {
        const filteredChildren = (item as any).children.filter((child: any) => 
          child.label.toLowerCase().includes(searchValue.toLowerCase())
        );
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }
      if ((item as any).label && (item as any).label.toLowerCase().includes(searchValue.toLowerCase())) {
        return item;
      }
      return null;
    }).filter(Boolean);
  }, [searchValue]);

  // --- Main Render ---

  const renderContent = () => {
    switch (selectedKey) {
      case 'intro': return <IntroContent />;
      case 'roles': return <RolesContent />;
      case 'finance': return <FinanceContent />;
      case 'production': return <ProductionContent />;
      case 'sales': return <SalesContent />;
      case 'inventory': return <InventoryContent />;
      case 'troubleshooting': return <TroubleshootingContent />;
      default: return <IntroContent />;
    }
  };

  const SidebarContent = (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <Title level={4} className="!m-0 text-blue-600 flex items-center gap-2">
          <ReadOutlined /> Qo'llanma
        </Title>
        <div className="mt-3 flex flex-col gap-2">
          <Button 
            type="dashed" 
            danger 
            icon={<FilePdfOutlined />} 
            onClick={handlePrint}
            className="w-full border-red-200 text-red-500 hover:text-red-600 hover:border-red-400"
          >
            PDF Yuklab olish
          </Button>
          <Input 
            placeholder="Bo'limni qidirish..." 
            prefix={<SearchOutlined className="text-gray-400" />} 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
          />
        </div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ borderRight: 0 }}
        className="flex-1"
        onClick={({ key }) => {
          setSelectedKey(key);
          if (isMobile) setDrawerVisible(false);
        }}
        items={filteredMenuItems as any}
      />
    </div>
  );

  // Custom Icon Component for Production
  const ExperimentIcon = () => (
    <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 1024 1024" className="text-purple-600">
      <path d="M912 904L605.2 529.3c-7.3-8.9-10.7-20.2-9.4-31.6l49.3-433.2c1.6-13.8-9.2-26.1-23.2-26.1H397.6c-13.9 0-24.8 12.3-23.2 26.1L424 499.5c1.1 10.3-2.1 20.6-8.8 28.7L112 904c-11.7 14.3-1.5 36 16.9 36h766.2c18.4 0 28.6-21.7 16.9-36zM464.2 112h95.6l-37.4 329.1-20.8-25.5-37.4-303.6zm-176 754.7L469.7 544c20.3 24.8 51.5 24.8 71.8 0l181.5 322.7H288.2z" />
    </svg>
  );

  return (
    <Layout className="min-h-[85vh] bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
      {isMobile ? (
        <>
          <div className="p-4 border-b flex items-center gap-3">
            <Button icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)} />
            <Text strong>Qo'llanma Menyusi</Text>
          </div>
          <Drawer
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            bodyStyle={{ padding: 0 }}
            width={280}
          >
            {SidebarContent}
          </Drawer>
        </>
      ) : (
        <Sider width={280} theme="light" className="border-r border-gray-100 bg-white" style={{ background: '#fff' }}>
          {SidebarContent}
        </Sider>
      )}
      
      <Layout className="bg-white">
        <Content className={`p-6 md:p-8 ${isMobile ? 'h-auto' : 'overflow-y-auto h-[85vh]'}`}>
          {renderContent()}
        </Content>
      </Layout>

      {/* Hidden Printable Content */}
      <div style={{ display: "none" }}>
        <div ref={componentRef} className="p-10 bg-white">
          <style type="text/css" media="print">
            {`
              @media print {
                @page { margin: 20mm; }
                .no-print { display: none !important; }
                .page-break { page-break-after: always; }
                body { -webkit-print-color-adjust: exact; }
              }
            `}
          </style>
          
          <div className="text-center mb-12 page-break">
             <Title level={1} style={{ color: '#1890ff', fontSize: '36px', marginBottom: '16px' }}>MUTex Knowledge Base</Title>
             <Paragraph className="text-xl text-gray-500">
               Korxonani samarali boshqarish uchun mukammal qo'llanma
             </Paragraph>
             <div className="mt-12 p-6 border rounded-lg bg-gray-50 text-left max-w-2xl mx-auto">
                <Title level={4}>Hujjat haqida:</Title>
                <Paragraph>Ushbu hujjat MUTex tizimidan foydalanish bo'yicha to'liq qo'llanmani o'z ichiga oladi.</Paragraph>
                <Space direction="vertical">
                  <Text type="secondary">Chop etilgan sana: {new Date().toLocaleDateString()}</Text>
                  <Text type="secondary">Versiya: 1.0</Text>
                </Space>
             </div>
          </div>

          <div className="page-break">
            <Divider orientation="left"><Title level={2}>1. Kirish</Title></Divider>
            <IntroContent />
          </div>

          <div className="page-break">
            <Divider orientation="left"><Title level={2}>2. Rollar va Ruxsatlar</Title></Divider>
            <RolesContent />
          </div>

          <div className="page-break">
            <Divider orientation="left"><Title level={2}>3. Moliya va Hisob-kitob</Title></Divider>
            <FinanceContent />
          </div>

          <div className="page-break">
             <Divider orientation="left"><Title level={2}>4. Ishlab Chiqarish</Title></Divider>
             <ProductionContent />
          </div>

          <div className="page-break">
             <Divider orientation="left"><Title level={2}>5. Fakturalar va Sotuv</Title></Divider>
             <SalesContent />
          </div>

          <div className="page-break">
             <Divider orientation="left"><Title level={2}>6. Ombor va Logistika</Title></Divider>
             <InventoryContent />
          </div>

          <div>
             <Divider orientation="left"><Title level={2}>7. FAQ</Title></Divider>
             <TroubleshootingContent />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DocumentationPage;
