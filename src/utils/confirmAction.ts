import { Modal } from 'antd';

export const confirmAction = ({
  title,
  content,
  danger = false,
}: {
  title: string;
  content: string;
  danger?: boolean;
}): Promise<boolean> => new Promise((resolve) => {
  let settled = false;
  const settle = (value: boolean) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };
  Modal.confirm({
    title,
    content,
    okText: danger ? 'Xác nhận xoá' : 'Xác nhận',
    cancelText: 'Huỷ',
    okButtonProps: danger ? { danger: true } : undefined,
    onOk: () => settle(true),
    onCancel: () => settle(false),
    afterClose: () => settle(false),
  });
});
