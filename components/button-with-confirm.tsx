"use client";

import {
  Button,
  ButtonProps,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";

export type ButtonWithConfirmProps = ButtonProps & {
  confirmTitle?: string;
  confirmText?: string | React.ReactNode;
  onConfirm?: () => void;
};

export const ButtonWithConfirm = ({
  confirmTitle = "确认",
  confirmText = "确认？",
  onConfirm,
  ...props
}: ButtonWithConfirmProps) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Button {...props} onPress={onOpen} />
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">{confirmTitle}</ModalHeader>
              <ModalBody>{confirmText}</ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    onConfirm?.();
                    onClose();
                  }}
                >
                  确认
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
